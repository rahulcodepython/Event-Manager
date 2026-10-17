"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { AttendancePunctuality } from "../../schema/attendance.types";

interface AnalysisPunctualityChartProps {
    punctuality: AttendancePunctuality;
}

export function AnalysisPunctualityChart({ punctuality }: AnalysisPunctualityChartProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const data = React.useMemo(() => {
        return [
            { category: "Early / On Time", count: punctuality.early_count, fill: "#10b981" },
            { category: "Late Check-in", count: punctuality.late_count, fill: "#f59e0b" },
        ];
    }, [punctuality.early_count, punctuality.late_count]);

    const total = punctuality.early_count + punctuality.late_count;

    return (
        <Card className="flex flex-col shadow-xs border-border/80">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Punctuality Breakdown</CardTitle>
                <CardDescription className="text-sm">
                    Attendees checked in at/before vs after scheduled start time
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 p-6">
                <div className="h-52 w-full flex items-center justify-center">
                    {
                        !mounted ? <div className="text-xs text-muted-foreground">Loading chart...</div> : total === 0 ? <div className="text-xs text-muted-foreground">No check-ins recorded yet</div> : <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="category"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--background)",
                                        borderColor: "var(--border)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                />
                                <Bar dataKey="count" name="Attendees" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    }
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-center text-xs">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
                        <span className="block text-[10px] text-muted-foreground font-medium">Early / On-Time</span>
                        <span className="text-sm font-bold">{punctuality.early_count}</span>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400">
                        <span className="block text-[10px] text-muted-foreground font-medium">Late Check-in</span>
                        <span className="text-sm font-bold">{punctuality.late_count}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
