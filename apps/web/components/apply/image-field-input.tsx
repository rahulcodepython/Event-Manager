"use client";

import * as React from "react";
import { ImageIcon, Loader2, RefreshCwIcon, XIcon } from "lucide-react";

import { Button } from "../ui/button";
import { apiBaseUrl } from "../../react-query/client";
import type { FormField } from "../../schema/forms.types";

const MAX_BYTES = 2 * 1024 * 1024;
const VIEW = 240; // crop viewport, CSS px
const MAX_OUTPUT = 1200; // longest side sent to the server

interface ImageFieldInputProps {
    eventFormId: string;
    field: FormField;
    /** The upload token, or "" when nothing is uploaded. */
    value: string;
    onChange: (token: string) => void;
}

function minSize(field: FormField) {
    const fallbackH = field.type === "signature" ? 100 : 300;
    return { w: field.validation?.min_width ?? 300, h: field.validation?.min_height ?? fallbackH };
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("This file is not an image we can read."));
        img.src = URL.createObjectURL(file);
    });
}

async function upload(eventFormId: string, fieldKey: string, blob: Blob, name: string): Promise<string> {
    const body = new FormData();
    body.append("file", blob, name);
    const res = await fetch(`${apiBaseUrl}/public/apply/${eventFormId}/uploads?field=${encodeURIComponent(fieldKey)}`, {
        method: "POST",
        body,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message || "Upload failed");
    return json.data.token as string;
}

/**
 * Photo or signature upload on the public form. Photos are cropped to a
 * square in the browser (drag to move, slider to zoom); both are checked
 * against the field's minimum size before upload, and again on the server.
 */
export function ImageFieldInput({ eventFormId, field, value, onChange }: ImageFieldInputProps) {
    const min = minSize(field);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [image, setImage] = React.useState<HTMLImageElement | null>(null);
    const [preview, setPreview] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);

    const reset = () => {
        setImage(null);
        setPreview(null);
        setError(null);
        onChange("");
    };

    const onFile = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        if (file.size > MAX_BYTES) {
            setError("The image must be 2 MB or smaller.");
            return;
        }
        let img: HTMLImageElement;
        try {
            img = await loadImage(file);
        } catch (e) {
            setError((e as Error).message);
            return;
        }
        const tooSmall = field.type === "photo"
            ? Math.min(img.naturalWidth, img.naturalHeight) < Math.max(min.w, min.h)
            : img.naturalWidth < min.w || img.naturalHeight < min.h;
        if (tooSmall) {
            setError(`The image must be at least ${min.w}×${min.h} pixels (this one is ${img.naturalWidth}×${img.naturalHeight}).`);
            return;
        }
        if (field.type === "photo") {
            setImage(img); // crop first
            return;
        }
        setBusy(true);
        try {
            onChange(await upload(eventFormId, field.key, file, file.name));
            setPreview(img.src);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const onCropped = async (blob: Blob, url: string) => {
        setBusy(true);
        setError(null);
        try {
            onChange(await upload(eventFormId, field.key, blob, "photo.jpg"));
            setPreview(url);
            setImage(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    onFile(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
            {
                image ? <PhotoCropper image={image} minSide={Math.max(min.w, min.h)} busy={busy} onCancel={() => setImage(null)} onDone={onCropped} /> : value && preview ? <div className="flex items-center gap-3 rounded-lg border p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                    <img
                        src={preview}
                        alt={field.label}
                        className={field.type === "photo" ? "size-20 rounded-md object-cover" : "h-14 max-w-48 rounded-md border bg-white object-contain"}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                        <span className="text-sm font-medium">Uploaded</span>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => inputRef.current?.click()}>
                                <RefreshCwIcon className="size-3.5" />
                                Change
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={reset}>
                                <XIcon className="size-3.5" />
                                Remove
                            </Button>
                        </div>
                    </div>
                </div> : <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-lg border border-dashed bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                >
                    {
                        busy ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <ImageIcon className="size-6 text-muted-foreground" />
                    }
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{field.placeholder || (field.type === "photo" ? "Upload a photo" : "Upload your signature")}</span>
                        <span className="text-xs text-muted-foreground">
                            At least {min.w}×{min.h} px · JPEG, PNG or WebP up to 2 MB
                        </span>
                    </div>
                </button>
            }
            {
                error && <p className="text-xs font-medium text-destructive">{error}</p>
            }
        </div>
    );
}

/** Square crop: drag to move, slider to zoom. Never crops below minSide pixels. */
function PhotoCropper({ image, minSide, busy, onCancel, onDone }: {
    image: HTMLImageElement;
    minSide: number;
    busy: boolean;
    onCancel: () => void;
    onDone: (blob: Blob, url: string) => void;
}) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const base = Math.min(w, h);
    // zoom 1 = the largest square; the crop side is base / zoom.
    const maxZoom = Math.max(1, base / minSide);
    const [zoom, setZoom] = React.useState(1);
    const [center, setCenter] = React.useState({ x: w / 2, y: h / 2 });
    const drag = React.useRef<{ x: number, y: number, cx: number, cy: number } | null>(null);

    const side = base / zoom;
    const clamp = React.useCallback((c: { x: number, y: number }, s: number) => ({
        x: Math.min(Math.max(c.x, s / 2), w - s / 2),
        y: Math.min(Math.max(c.y, s / 2), h - s / 2),
    }), [w, h]);
    const crop = clamp(center, side);

    React.useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, VIEW, VIEW);
        ctx.drawImage(image, crop.x - side / 2, crop.y - side / 2, side, side, 0, 0, VIEW, VIEW);
    }, [image, crop.x, crop.y, side]);

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current) return;
        const scale = side / VIEW; // source px per screen px
        setCenter(clamp({
            x: drag.current.cx - (e.clientX - drag.current.x) * scale,
            y: drag.current.cy - (e.clientY - drag.current.y) * scale,
        }, side));
    };

    const done = () => {
        const out = Math.round(Math.min(side, MAX_OUTPUT));
        const canvas = document.createElement("canvas");
        canvas.width = out;
        canvas.height = out;
        canvas.getContext("2d")?.drawImage(image, crop.x - side / 2, crop.y - side / 2, side, side, 0, 0, out, out);
        canvas.toBlob((blob) => {
            if (blob) onDone(blob, canvas.toDataURL("image/jpeg", 0.9));
        }, "image/jpeg", 0.92);
    };

    return (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
            <canvas
                ref={canvasRef}
                width={VIEW}
                height={VIEW}
                className="cursor-move touch-none rounded-md bg-muted"
                style={{ width: VIEW, height: VIEW }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => {
                    drag.current = null;
                }}
            />
            <div className="flex w-full max-w-60 items-center gap-2 text-xs text-muted-foreground">
                <span>Zoom</span>
                <input
                    type="range"
                    min={1}
                    max={maxZoom}
                    step={0.01}
                    value={zoom}
                    disabled={maxZoom <= 1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1"
                />
            </div>
            <p className="text-xs text-muted-foreground">Drag to position your face in the square.</p>
            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <Button type="button" size="sm" onClick={done} disabled={busy} className="gap-1.5">
                    {
                        busy && <Loader2 className="size-3.5 animate-spin" />
                    }
                    Use photo
                </Button>
            </div>
        </div>
    );
}
