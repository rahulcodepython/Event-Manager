"use client";

import * as React from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { AttendanceByDate } from "../../schema/attendance.types";

interface AnalysisDateLineChartProps {
    data: AttendanceByDate[];
}

export function AnalysisDateLineChart({ data }: AnalysisDateLineChartProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const formattedData = React.useMemo(() => {
        return data.map((d) => ({
            ...d,
            displayDate: d.date.length > 5 ? d.date.slice(5) : d.date,
        }));
    }, [data]);

    return (
        <Card className="flex flex-col shadow-xs border-border/80">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Attendance by Date</CardTitle>
                <CardDescription className="text-sm">
                    Number of unique attendees checked in per session date
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 p-6">
                <div className="h-52 w-full flex items-center justify-center">
                    {
                        !mounted ? <div className="text-xs text-muted-foreground">Loading chart...</div> : formattedData.length === 0 ? <div className="text-xs text-muted-foreground">No attendance records for selected range</div> : <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="displayDate"
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
                                    labelFormatter={(label, payload) => {
                                        const original = payload?.[0]?.payload?.date;
                                        return original ? `Date: ${original}` : label;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="attendees_count"
                                    name="Attendees"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: "#3b82f6" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    }
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                    <span>Total session dates tracked:</span>
                    <span className="font-semibold text-foreground">{data.length}</span>
                </div>
            </CardContent>
        </Card>
    );
}
