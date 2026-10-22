"use client";

import * as React from "react";
import { FileIcon, Loader2, UploadCloud, XIcon } from "lucide-react";

import { Button } from "../ui/button";
import { DEFAULT_FILE_ACCEPT, FILE_UPLOAD_MAX_MB } from "../../lib/constants";
import { uploadFormFile } from "../../lib/uploads";
import type { FormField } from "../../schema/forms.types";

interface FileFieldInputProps {
    eventFormId: string;
    field: FormField;
    /** Upload token(s); a list for a multi-file field. */
    value: string | string[] | undefined;
    onChange: (value: string | string[]) => void;
}

/** File Upload field on the public form: each file is uploaded on pick. */
export function FileFieldInput({ eventFormId, field, value, onChange }: FileFieldInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    // File names of this visit; a restored draft only knows the tokens.
    const [names, setNames] = React.useState<Record<string, string>>({});

    const multiple = Boolean(field.validation?.multiple);
    const tokens = Array.isArray(value) ? value : value ? [value] : [];
    const accept = field.validation?.accept || DEFAULT_FILE_ACCEPT;
    const maxMB = Math.min(field.validation?.max_file_size_mb || FILE_UPLOAD_MAX_MB, FILE_UPLOAD_MAX_MB);

    const emit = (next: string[]) => onChange(multiple ? next : next[0] ?? "");

    const onFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        setError("");
        const picked = multiple ? Array.from(files) : [files[0]];
        const tooBig = picked.find((f) => f.size > maxMB * 1024 * 1024);
        if (tooBig) {
            setError(`${tooBig.name} is larger than ${maxMB} MB.`);
            return;
        }
        setBusy(true);
        try {
            const uploaded: Record<string, string> = {};
            for (const f of picked) {
                uploaded[await uploadFormFile(eventFormId, field.key, f, f.name)] = f.name;
            }
            setNames((prev) => ({ ...prev, ...uploaded }));
            emit(multiple ? [...tokens, ...Object.keys(uploaded)] : Object.keys(uploaded));
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
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                    onFiles(e.target.files);
                    e.target.value = "";
                }}
            />
            {
                tokens.map((t, i) => <div key={t} className="flex items-center gap-3 rounded-lg border p-3">
                    <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{names[t] || `Attached file ${tokens.length > 1 ? i + 1 : ""}`.trim()}</span>
                    <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => emit(tokens.filter((x) => x !== t))}>
                        <XIcon className="size-3.5" />
                        Remove
                    </Button>
                </div>)
            }
            {
                (multiple || tokens.length === 0) && <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40 disabled:opacity-60"
                >
                    {
                        busy ? <Loader2 className="mb-2 size-8 animate-spin text-muted-foreground" /> : <UploadCloud className="mb-2 size-8 text-muted-foreground" />
                    }
                    <span className="text-sm font-medium text-foreground">{field.placeholder || (multiple ? "Click to add files" : "Click to select a file")}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{accept} (max {maxMB} MB)</span>
                </button>
            }
            {
                error && <p className="text-xs font-medium text-destructive">{error}</p>
            }
        </div>
    );
}
