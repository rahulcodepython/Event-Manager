// Package imageproc validates and normalizes images uploaded on the public
// form: applicant photos (cropped to a square) and signatures.
package imageproc

import (
    "bytes"
    "errors"
    "fmt"
    "image"
    "image/draw"
    "image/jpeg"
    "image/png"

    _ "image/gif" // register decoders
    _ "golang.org/x/image/webp"

    xdraw "golang.org/x/image/draw"
)

const (
    // MaxUploadBytes is the largest accepted upload.
    MaxUploadBytes = 2 << 20
    // maxPixels guards against decompression bombs (small file, huge image).
    maxPixels = 40_000_000

    photoSize         = 600 // photos are stored 600×600
    signatureMaxWidth = 600
)

var ErrInvalid = errors.New("invalid image")

func invalid(format string, args ...any) error {
    return fmt.Errorf("%w: %s", ErrInvalid, fmt.Sprintf(format, args...))
}

type Kind string

const (
    Photo     Kind = "photo"
    Signature Kind = "signature"
)

// Result is a processed image ready to store.
type Result struct {
    Data        []byte
    Ext         string
    ContentType string
}

// Process checks the image is at least minW×minH and normalizes it:
// a photo is centre-cropped to a square and stored as a 600×600 JPEG; a
// signature keeps its shape (and transparency), scaled to at most 600 px
// wide, as PNG.
func Process(kind Kind, data []byte, minW, minH int) (*Result, error) {
    if len(data) > MaxUploadBytes {
        return nil, invalid("the image must be %d MB or smaller", MaxUploadBytes>>20)
    }
    cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
    if err != nil {
        return nil, invalid("use a JPEG, PNG or WebP image")
    }
    switch format {
    case "jpeg", "png", "webp", "gif":
    default:
        return nil, invalid("use a JPEG, PNG or WebP image")
    }
    if cfg.Width*cfg.Height > maxPixels {
        return nil, invalid("the image is too large")
    }
    if cfg.Width < minW || cfg.Height < minH {
        return nil, invalid("the image must be at least %d×%d pixels (this one is %d×%d)", minW, minH, cfg.Width, cfg.Height)
    }

    src, _, err := image.Decode(bytes.NewReader(data))
    if err != nil {
        return nil, invalid("the image could not be read")
    }

    switch kind {
    case Photo:
        return encodeJPEG(squarePhoto(src))
    case Signature:
        return encodePNG(scaleToWidth(src, signatureMaxWidth))
    }
    return nil, invalid("unknown image kind")
}

// squarePhoto centre-crops to a square and scales it to photoSize.
func squarePhoto(src image.Image) image.Image {
    b := src.Bounds()
    side := min(b.Dx(), b.Dy())
    x0 := b.Min.X + (b.Dx()-side)/2
    y0 := b.Min.Y + (b.Dy()-side)/2
    crop := image.Rect(x0, y0, x0+side, y0+side)

    size := min(side, photoSize)
    dst := image.NewRGBA(image.Rect(0, 0, size, size))
    // JPEG has no transparency: paint white under it.
    draw.Draw(dst, dst.Bounds(), image.White, image.Point{}, draw.Src)
    xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, crop, xdraw.Over, nil)
    return dst
}

func scaleToWidth(src image.Image, maxWidth int) image.Image {
    b := src.Bounds()
    if b.Dx() <= maxWidth {
        dst := image.NewNRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
        draw.Draw(dst, dst.Bounds(), src, b.Min, draw.Src)
        return dst
    }
    h := b.Dy() * maxWidth / b.Dx()
    dst := image.NewNRGBA(image.Rect(0, 0, maxWidth, max(h, 1)))
    xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, b, xdraw.Src, nil)
    return dst
}

func encodeJPEG(img image.Image) (*Result, error) {
    var buf bytes.Buffer
    if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
        return nil, err
    }
    return &Result{Data: buf.Bytes(), Ext: "jpg", ContentType: "image/jpeg"}, nil
}

func encodePNG(img image.Image) (*Result, error) {
    var buf bytes.Buffer
    if err := (&png.Encoder{CompressionLevel: png.BestCompression}).Encode(&buf, img); err != nil {
        return nil, err
    }
    return &Result{Data: buf.Bytes(), Ext: "png", ContentType: "image/png"}, nil
}
