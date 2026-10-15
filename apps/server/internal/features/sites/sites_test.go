package sites

import (
    "archive/zip"
    "bytes"
    "strings"
    "testing"
)

func makeZip(t *testing.T, files map[string]string) []byte {
    t.Helper()
    var buf bytes.Buffer
    zw := zip.NewWriter(&buf)
    for name, body := range files {
        w, err := zw.Create(name)
        if err != nil {
            t.Fatal(err)
        }
        _, _ = w.Write([]byte(body))
    }
    if err := zw.Close(); err != nil {
        t.Fatal(err)
    }
    return buf.Bytes()
}

func TestReadZip(t *testing.T) {
    files, err := readZip(makeZip(t, map[string]string{
        "site/index.html": "x", "site/css/a.css": "y", "__MACOSX/._x": "z",
    }))
    if err != nil {
        t.Fatal(err)
    }
    paths := map[string]bool{}
    for _, f := range files {
        paths[f.Path] = true
    }
    if !paths["index.html"] || !paths["css/a.css"] || len(files) != 2 {
        t.Fatalf("got %v", paths)
    }

    bad := map[string]map[string]string{
        "traversal":  {"../x.html": "x", "index.html": "y"},
        "absolute":   {"/etc/x.html": "x", "index.html": "y"},
        "backslash":  {"..\\x.html": "x", "index.html": "y"},
        "type":       {"index.html": "y", "a.exe": "x"},
        "no index":   {"home.html": "y"},
        "two roots":  {"a/index.html": "y", "b/x.html": "z"},
        "too big":    {"index.html": strings.Repeat("0", maxSiteBytes+1)},
    }
    for name, f := range bad {
        if _, err := readZip(makeZip(t, f)); err == nil {
            t.Errorf("%s: accepted", name)
        }
    }
    if _, err := readZip([]byte("not a zip")); err == nil {
        t.Error("garbage accepted")
    }
}

func TestValidateSlug(t *testing.T) {
    ok := []string{"abc", "my-event-2026", "A1B", strings.Repeat("a", 40)}
    for _, s := range ok {
        if _, reason := ValidateSlug(s); reason != "" {
            t.Errorf("%q rejected: %s", s, reason)
        }
    }
    bad := []string{"ab", strings.Repeat("a", 41), "-abc", "abc-", "a--b", "a_b", "a.b", "admin", "www", ""}
    for _, s := range bad {
        if _, reason := ValidateSlug(s); reason == "" {
            t.Errorf("%q accepted", s)
        }
    }
}
