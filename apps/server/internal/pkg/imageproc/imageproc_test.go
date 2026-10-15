package imageproc

import (
    "bytes"
    "errors"
    "image"
    "image/color"
    "image/png"
    "testing"
)

func pngOf(t *testing.T, w, h int) []byte {
    t.Helper()
    img := image.NewNRGBA(image.Rect(0, 0, w, h))
    for x := 0; x < w; x++ {
        img.Set(x, h/2, color.Black)
    }
    var buf bytes.Buffer
    if err := png.Encode(&buf, img); err != nil {
        t.Fatal(err)
    }
    return buf.Bytes()
}

func TestProcess(t *testing.T) {
    res, err := Process(Photo, pngOf(t, 1200, 800), 300, 300)
    if err != nil {
        t.Fatal(err)
    }
    cfg, format, _ := image.DecodeConfig(bytes.NewReader(res.Data))
    if format != "jpeg" || cfg.Width != 600 || cfg.Height != 600 {
        t.Fatalf("photo = %s %dx%d", format, cfg.Width, cfg.Height)
    }

    res, err = Process(Signature, pngOf(t, 900, 300), 300, 100)
    if err != nil {
        t.Fatal(err)
    }
    cfg, format, _ = image.DecodeConfig(bytes.NewReader(res.Data))
    if format != "png" || cfg.Width != 600 || cfg.Height != 200 {
        t.Fatalf("signature = %s %dx%d", format, cfg.Width, cfg.Height)
    }

    if _, err := Process(Photo, pngOf(t, 200, 400), 300, 300); !errors.Is(err, ErrInvalid) {
        t.Fatalf("small photo accepted: %v", err)
    }
    if _, err := Process(Photo, []byte("not an image"), 1, 1); !errors.Is(err, ErrInvalid) {
        t.Fatalf("garbage accepted: %v", err)
    }
}
