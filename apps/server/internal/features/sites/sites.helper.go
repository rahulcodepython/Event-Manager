package sites

import (
    "archive/zip"
    "bytes"
    "errors"
    "fmt"
    "io"
    "mime"
    "path"
    "regexp"
    "strings"
)

const (
    maxZipBytes      = 10 << 20 // compressed upload
    maxSiteBytes     = 10 << 20 // all files unzipped
    maxSiteFiles     = 300
    sitesKeyPrefix   = "sites/"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`)

// reservedSlugs can never be claimed (infrastructure and look-alikes).
var reservedSlugs = map[string]bool{
    "www": true, "api": true, "admin": true, "app": true, "apps": true, "mail": true, "email": true,
    "smtp": true, "imap": true, "pop": true, "ftp": true, "ns1": true, "ns2": true, "dns": true,
    "sites": true, "site": true, "static": true, "assets": true, "cdn": true, "media": true,
    "status": true, "help": true, "support": true, "docs": true, "blog": true, "dashboard": true,
    "login": true, "auth": true, "account": true, "accounts": true, "billing": true, "pay": true,
    "payments": true, "register": true, "apply": true, "identitycard": true, "official": true,
    "security": true, "root": true, "test": true, "dev": true, "staging": true, "preview": true,
}

// allowedTypes: file extensions a site may contain, with their content type.
var allowedTypes = map[string]string{
    ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json", ".map": "application/json", ".webmanifest": "application/manifest+json",
    ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
}

var ErrInvalidSite = errors.New("invalid site")

func invalidSite(format string, args ...any) error {
    return fmt.Errorf("%w: %s", ErrInvalidSite, fmt.Sprintf(format, args...))
}

// ValidateSlug normalizes a slug and returns why it cannot be used ("" if it can).
func ValidateSlug(slug string) (string, string) {
    slug = strings.ToLower(strings.TrimSpace(slug))
    switch {
    case !slugPattern.MatchString(slug):
        return slug, "use 3 to 40 lowercase letters, digits or hyphens, starting and ending with a letter or digit"
    case strings.Contains(slug, "--"):
        return slug, "two hyphens in a row are not allowed"
    case reservedSlugs[slug]:
        return slug, "this name is reserved"
    }
    return slug, ""
}

type siteFile struct {
    Path        string
    Data        []byte
    ContentType string
}

// readZip checks an uploaded zip and returns its files. index.html must be
// at the root, or inside a single top-level folder (which is then removed).
func readZip(data []byte) ([]siteFile, error) {
    zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
    if err != nil {
        return nil, invalidSite("not a valid zip file")
    }

    var files []siteFile
    var total int64
    for _, f := range zr.File {
        name := f.Name
        if f.FileInfo().IsDir() || strings.HasPrefix(name, "__MACOSX/") || path.Base(name) == ".DS_Store" {
            continue
        }
        if f.Mode()&0o170000 == 0o120000 { // symlink
            return nil, invalidSite("%s: links are not allowed", name)
        }
        clean := path.Clean("/" + strings.ReplaceAll(name, "\\", "/"))[1:]
        if clean == "" || clean != strings.TrimPrefix(name, "./") || strings.HasPrefix(clean, "../") {
            return nil, invalidSite("%s: invalid path", name)
        }
        ext := strings.ToLower(path.Ext(clean))
        contentType, ok := allowedTypes[ext]
        if !ok {
            return nil, invalidSite("%s: file type %q is not allowed", name, ext)
        }
        if len(files) >= maxSiteFiles {
            return nil, invalidSite("more than %d files", maxSiteFiles)
        }
        if total+int64(f.UncompressedSize64) > maxSiteBytes {
            return nil, invalidSite("site is larger than %d MB unzipped", maxSiteBytes>>20)
        }

        rc, err := f.Open()
        if err != nil {
            return nil, invalidSite("%s: cannot read", name)
        }
        // Never trust the header size: cap the actual read.
        body, err := io.ReadAll(io.LimitReader(rc, maxSiteBytes-total+1))
        rc.Close()
        if err != nil {
            return nil, invalidSite("%s: cannot read", name)
        }
        total += int64(len(body))
        if total > maxSiteBytes {
            return nil, invalidSite("site is larger than %d MB unzipped", maxSiteBytes>>20)
        }
        files = append(files, siteFile{Path: clean, Data: body, ContentType: contentType})
    }
    return stripRootFolder(files)
}

// stripRootFolder accepts index.html at the root, or a zip whose files all
// sit in one folder that has index.html.
func stripRootFolder(files []siteFile) ([]siteFile, error) {
    for _, f := range files {
        if f.Path == "index.html" {
            return files, nil
        }
    }
    if len(files) == 0 {
        return nil, invalidSite("the zip is empty")
    }
    root, _, found := strings.Cut(files[0].Path, "/")
    if !found {
        return nil, invalidSite("index.html must be at the top of the zip")
    }
    hasIndex := false
    for i := range files {
        rest, ok := strings.CutPrefix(files[i].Path, root+"/")
        if !ok {
            return nil, invalidSite("index.html must be at the top of the zip")
        }
        files[i].Path = rest
        hasIndex = hasIndex || rest == "index.html"
    }
    if !hasIndex {
        return nil, invalidSite("index.html must be at the top of the zip")
    }
    return files, nil
}

func eventPrefix(eventID string) string {
    return sitesKeyPrefix + eventID + "/"
}

// ObjectKey is where a site file is stored.
func ObjectKey(eventID, version, filePath string) string {
    return eventPrefix(eventID) + version + "/" + filePath
}

// ContentTypeFor returns the content type for a served path.
func ContentTypeFor(p string) string {
    if t, ok := allowedTypes[strings.ToLower(path.Ext(p))]; ok {
        return t
    }
    if t := mime.TypeByExtension(path.Ext(p)); t != "" {
        return t
    }
    return "application/octet-stream"
}
