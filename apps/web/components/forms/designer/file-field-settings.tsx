"use client";

import * as React from "react";
import { Check, ChevronsUpDown, File, Files, HardDrive, X } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "../../ui/command";
import { Label } from "../../ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../ui/popover";
import { Switch } from "../../ui/switch";
import { cn } from "cn";

export interface FileTypeOption {
    ext: string;
    label: string;
}

export interface FileTypeCategory {
    category: string;
    items: FileTypeOption[];
}

export const PRESET_FILE_TYPES: FileTypeCategory[] = [
    {
        category: "Images",
        items: [
            { ext: ".png", label: "PNG Image" },
            { ext: ".jpg", label: "JPG Image" },
            { ext: ".jpeg", label: "JPEG Image" },
            { ext: ".webp", label: "WebP Image" },
            { ext: ".svg", label: "SVG Vector Graphic" },
            { ext: ".gif", label: "GIF Animation" },
        ],
    },
    {
        category: "Documents",
        items: [
            { ext: ".pdf", label: "PDF Document" },
            { ext: ".docx", label: "Microsoft Word (.docx)" },
            { ext: ".doc", label: "Microsoft Word (.doc)" },
            { ext: ".txt", label: "Plain Text Document" },
            { ext: ".rtf", label: "Rich Text Document" },
        ],
    },
    {
        category: "Spreadsheets & Data",
        items: [
            { ext: ".xlsx", label: "Excel Spreadsheet (.xlsx)" },
            { ext: ".xls", label: "Excel 97-2004 (.xls)" },
            { ext: ".csv", label: "CSV Data Table" },
            { ext: ".json", label: "JSON Data File" },
        ],
    },
    {
        category: "Presentations",
        items: [
            { ext: ".pptx", label: "PowerPoint Presentation (.pptx)" },
            { ext: ".ppt", label: "PowerPoint 97-2004 (.ppt)" },
        ],
    },
    {
        category: "Audio & Video",
        items: [
            { ext: ".mp3", label: "MP3 Audio" },
            { ext: ".wav", label: "WAV Audio" },
            { ext: ".mp4", label: "MP4 Video" },
            { ext: ".mov", label: "QuickTime Video" },
            { ext: ".webm", label: "WebM Media" },
        ],
    },
    {
        category: "Archives",
        items: [
            { ext: ".zip", label: "ZIP Archive" },
            { ext: ".rar", label: "RAR Archive" },
            { ext: ".tar.gz", label: "Compressed Tarball" },
            { ext: ".7z", label: "7-Zip Archive" },
        ],
    },
];

interface FileFieldSettingsProps {
    acceptValue: string;
    onAcceptChange: (newAccept: string) => void;
    maxFileSizeMB: number;
    onMaxFileSizeChange: (sizeMB: number) => void;
    allowMultiple: boolean;
    onAllowMultipleChange: (allow: boolean) => void;
}

export function FileFieldSettings({
    acceptValue,
    onAcceptChange,
    maxFileSizeMB,
    onMaxFileSizeChange,
    allowMultiple,
    onAllowMultipleChange,
}: FileFieldSettingsProps) {
    const [open, setOpen] = React.useState(false);

    // Parse comma-separated string into selected array
    const selectedExtensions = React.useMemo(() => {
        if (!acceptValue) return [];
        return acceptValue
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
    }, [acceptValue]);

    const handleToggleExtension = (ext: string) => {
        const lower = ext.toLowerCase();
        let updated: string[];
        if (selectedExtensions.includes(lower)) {
            updated = selectedExtensions.filter((e) => e !== lower);
        } else {
            updated = [...selectedExtensions, lower];
        }
        onAcceptChange(updated.join(", "));
    };

    const handleClearAll = () => {
        onAcceptChange("");
    };

    const count = selectedExtensions.length;
    const placeholderText = `(${count} items selected)`;

    return (
        <div className="space-y-4 rounded-lg border p-3.5 bg-muted/10">
            {/* Accepted File Types Selector */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <File className="size-3.5 text-primary" />
                        <span>Accepted File Types</span>
                    </Label>
                    {
                        count > 0 && <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                            Clear all
                        </button>
                    }
                </div>

                {/* Combobox Trigger */}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger
                        render={
                            <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between font-normal bg-background"
                            >
                                <span className={cn("truncate", count === 0 ? "text-muted-foreground" : "font-medium text-foreground")}>
                                    {placeholderText}
                                </span>
                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                        }
                    />

                    <PopoverContent className="w-[320px] sm:w-95 p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search file type or extension..." />
                            <CommandList className="max-h-60 overflow-y-auto">
                                <CommandEmpty>No file type found.</CommandEmpty>
                                {
                                    PRESET_FILE_TYPES.map((group) => (
                                        <CommandGroup key={group.category} heading={group.category}>
                                            {
                                                group.items.map((item) => {
                                                    const isSelected = selectedExtensions.includes(item.ext.toLowerCase());
                                                    return (
                                                        <CommandItem
                                                            key={item.ext}
                                                            value={`${item.ext} ${item.label}`}
                                                            onSelect={() => handleToggleExtension(item.ext)}
                                                            className="flex items-center justify-between cursor-pointer text-xs py-1.5"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                                    {item.ext}
                                                                </span>
                                                                <span className="text-xs text-foreground">
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                            <div className={cn("size-4 rounded-xs border flex items-center justify-center transition-colors", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                                                                {
                                                                    isSelected && <Check className="size-3" />
                                                                }
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })
                                            }
                                        </CommandGroup>
                                    ))
                                }
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Max File Size Range Slider (1 MB to 100 MB) */}
            <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                    <Label htmlFor="max-file-size-range" className="text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer">
                        <HardDrive className="size-3.5 text-primary" />
                        <span>Max File Size</span>
                    </Label>
                    <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
                        {maxFileSizeMB} MB
                    </Badge>
                </div>

                <div className="space-y-1 pt-1">
                    <input
                        id="max-file-size-range"
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={maxFileSizeMB}
                        onChange={(e) => onMaxFileSizeChange(Number(e.target.value))}
                        className="w-full h-2 bg-muted/80 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>1 MB</span>
                        <span>25 MB</span>
                        <span>50 MB</span>
                        <span>75 MB</span>
                        <span>100 MB</span>
                    </div>
                </div>
            </div>

            {/* 3. Allow Multiple Files Switch */}
            <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                    <Label htmlFor="allow-multiple-files-switch" className="text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer">
                        <Files className="size-3.5 text-primary" />
                        <span>Allow Multiple Files</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                        Allow users to attach multiple documents at once.
                    </p>
                </div>
                <Switch
                    id="allow-multiple-files-switch"
                    checked={allowMultiple}
                    onCheckedChange={onAllowMultipleChange}
                />
            </div>
        </div>
    );
}
