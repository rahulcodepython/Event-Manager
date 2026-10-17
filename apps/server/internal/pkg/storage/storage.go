// Package storage is a thin wrapper over S3-compatible object storage
// (MinIO locally, R2 or S3 in production).
package storage

import (
    "context"
    "errors"
    "fmt"
    "io"
    "log/slog"
    "time"

    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"

    "identitycard-server/internal/config"
)

var (
    ErrNotConfigured = errors.New("file storage is not configured (S3_*)")
    ErrNotFound      = errors.New("object not found")
)

type Store struct {
    client *minio.Client
    bucket string
}

// Connect builds the client and creates the bucket if it is missing. With
// no credentials it returns a Store that fails every call with
// ErrNotConfigured, so the rest of the app still runs.
func Connect(ctx context.Context, cfg *config.Config) *Store {
    if cfg.S3AccessKey == "" || cfg.S3SecretKey == "" {
        slog.Warn("storage: S3 credentials not set; event site uploads are disabled")
        return &Store{}
    }
    client, err := minio.New(cfg.S3Endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(cfg.S3AccessKey, cfg.S3SecretKey, ""),
        Secure: cfg.S3UseSSL,
        Region: cfg.S3Region,
    })
    if err != nil {
        slog.Error("storage: client", "error", err)
        return &Store{}
    }

    exists, err := client.BucketExists(ctx, cfg.S3Bucket)
    if err != nil {
        slog.Error("storage: bucket check", "bucket", cfg.S3Bucket, "error", err)
    } else if !exists {
        if err := client.MakeBucket(ctx, cfg.S3Bucket, minio.MakeBucketOptions{Region: cfg.S3Region}); err != nil {
            slog.Error("storage: create bucket", "bucket", cfg.S3Bucket, "error", err)
        }
    }
    return &Store{client: client, bucket: cfg.S3Bucket}
}

func (s *Store) ready() error {
    if s == nil || s.client == nil {
        return ErrNotConfigured
    }
    return nil
}

// Put uploads one object.
func (s *Store) Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
    if err := s.ready(); err != nil {
        return err
    }
    _, err := s.client.PutObject(ctx, s.bucket, key, body, size, minio.PutObjectOptions{ContentType: contentType})
    return err
}

// Object is an open object; the caller closes Body.
type Object struct {
    Body        io.ReadCloser
    Size        int64
    ContentType string
    ETag        string
}

// Get opens an object, or returns ErrNotFound.
func (s *Store) Get(ctx context.Context, key string) (*Object, error) {
    if err := s.ready(); err != nil {
        return nil, err
    }
    obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
    if err != nil {
        return nil, err
    }
    info, err := obj.Stat()
    if err != nil {
        obj.Close()
        if minio.ToErrorResponse(err).Code == "NoSuchKey" {
            return nil, ErrNotFound
        }
        return nil, err
    }
    return &Object{Body: obj, Size: info.Size, ContentType: info.ContentType, ETag: info.ETag}, nil
}

// DeletePrefix removes every object under prefix.
func (s *Store) DeletePrefix(ctx context.Context, prefix string) error {
    if err := s.ready(); err != nil {
        return err
    }
    objects := s.client.ListObjects(ctx, s.bucket, minio.ListObjectsOptions{Prefix: prefix, Recursive: true})
    for res := range s.client.RemoveObjects(ctx, s.bucket, objects, minio.RemoveObjectsOptions{}) {
        if res.Err != nil {
            return fmt.Errorf("storage: delete %s: %w", res.ObjectName, res.Err)
        }
    }
    return nil
}

// Copy duplicates an object within the bucket.
func (s *Store) Copy(ctx context.Context, srcKey, dstKey string) error {
    if err := s.ready(); err != nil {
        return err
    }
    _, err := s.client.CopyObject(ctx,
        minio.CopyDestOptions{Bucket: s.bucket, Object: dstKey},
        minio.CopySrcOptions{Bucket: s.bucket, Object: srcKey},
    )
    if minio.ToErrorResponse(err).Code == "NoSuchKey" {
        return ErrNotFound
    }
    return err
}

// Delete removes one object; a missing object is not an error.
func (s *Store) Delete(ctx context.Context, key string) error {
    if err := s.ready(); err != nil {
        return err
    }
    return s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}

// DeleteOlderThan removes objects under prefix last modified before cutoff
// and returns how many it removed.
func (s *Store) DeleteOlderThan(ctx context.Context, prefix string, cutoff time.Time) (int, error) {
    if err := s.ready(); err != nil {
        return 0, err
    }
    old := make(chan minio.ObjectInfo)
    count := 0
    go func() {
        defer close(old)
        for obj := range s.client.ListObjects(ctx, s.bucket, minio.ListObjectsOptions{Prefix: prefix, Recursive: true}) {
            if obj.Err == nil && obj.LastModified.Before(cutoff) {
                count++
                old <- obj
            }
        }
    }()
    for res := range s.client.RemoveObjects(ctx, s.bucket, old, minio.RemoveObjectsOptions{}) {
        if res.Err != nil {
            return count, fmt.Errorf("storage: delete %s: %w", res.ObjectName, res.Err)
        }
    }
    return count, nil
}
