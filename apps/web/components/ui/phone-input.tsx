"use client";

import * as React from "react";
import {
    DEFAULT_COUNTRY_CODES,
    fetchCountryCodes,
    type CountryCode,
} from "../../lib/country-codes";
import { Input } from "./input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select";
import { cn } from "../../lib/utils";

interface PhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function PhoneInput({
    value = "",
    onChange,
    placeholder = "10-digit mobile number",
    disabled = false,
    className = "",
}: PhoneInputProps) {
    const [countryCodes, setCountryCodes] = React.useState<CountryCode[]>(DEFAULT_COUNTRY_CODES);
    const [selectedDialCode, setSelectedDialCode] = React.useState<string>("+91");
    const [digits, setDigits] = React.useState<string>("");

    // Load dynamic country codes from restcountries.com in background
    React.useEffect(() => {
        let isMounted = true;
        fetchCountryCodes().then((codes) => {
            if (isMounted && codes.length > 0) {
                setCountryCodes(codes);
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    // Sync from incoming controlled value e.g. "+919876543210"
    React.useEffect(() => {
        if (!value) {
            setDigits("");
            return;
        }

        // Check if value starts with a known dial code
        const matched = countryCodes.find((c) => value.startsWith(c.dial_code));
        if (matched) {
            setSelectedDialCode(matched.dial_code);
            const numPart = value.slice(matched.dial_code.length).replace(/\D/g, "").slice(0, 10);
            setDigits(numPart);
        } else if (value.startsWith("+")) {
            // Generic plus prefix fallback
            const match = value.match(/^(\+\d{1,4})(\d{0,10})/);
            if (match) {
                setSelectedDialCode(match[1]);
                setDigits(match[2]);
            }
        } else {
            setDigits(value.replace(/\D/g, "").slice(0, 10));
        }
    }, [value, countryCodes]);

    const handleDialCodeChange = (newCode: string | null) => {
        if (!newCode) return;
        setSelectedDialCode(newCode);
        if (digits) {
            onChange(`${newCode}${digits}`);
        } else {
            onChange("");
        }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Enforce strictly digits, max length 10
        const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
        setDigits(clean);
        if (clean.length > 0) {
            onChange(`${selectedDialCode}${clean}`);
        } else {
            onChange("");
        }
    };

    return (
        <div className={cn("flex items-center gap-2 w-full", className)}>
            {/* Country code selector using Shadcn UI Select */}
            <div className="w-[120px] shrink-0">
                <Select
                    value={selectedDialCode}
                    onValueChange={handleDialCodeChange}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-10 text-sm font-mono bg-background/50">
                        <SelectValue placeholder="+91" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 w-64">
                        {countryCodes.map((c, i) => (
                            <SelectItem
                                key={`${c.code}-${c.dial_code}-${i}`}
                                value={c.dial_code}
                                className="text-sm font-mono"
                            >
                                <span className="mr-2">{c.flag}</span>
                                <span className="font-semibold">{c.dial_code}</span>
                                <span className="ml-1 text-muted-foreground text-xs">({c.code})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 10-digit number input */}
            <div className="relative flex-1">
                <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder={placeholder}
                    value={digits}
                    onChange={handleNumberChange}
                    disabled={disabled}
                    maxLength={10}
                    minLength={10}
                    className="h-10 text-sm font-mono"
                />
                {digits.length > 0 && (
                    <div className="absolute right-3 top-3 text-xs text-muted-foreground font-mono pointer-events-none">
                        {digits.length}/10
                    </div>
                )}
            </div>
        </div>
    );
}
