"use client";

import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { AttendanceOverview } from "../../schema/attendance.types";

interface AnalysisOverviewPieChartProps {
    overview: AttendanceOverview;
}

const COLORS = ["#10b981", "#94a3b8"]; // Emerald for attended, Slate for non-attended

export function AnalysisOverviewPieChart({ overview }: AnalysisOverviewPieChartProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const data = React.useMemo(() => {
        return [
            { name: "Attended", value: overview.total_attended },
            { name: "Not Attended", value: overview.total_not_attended },
        ];
    }, [overview.total_attended, overview.total_not_attended]);

    return (
        <Card className="flex flex-col shadow-xs border-border/80">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Attendance Ratio</CardTitle>
                        <CardDescription className="text-sm">
                            Total registered vs confirmed attendees
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-bold text-foreground">
                            {overview.attendance_percentage}%
                        </span>
                        <p className="text-xs text-muted-foreground">turnout rate</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-6">
                <div className="h-52 w-full flex items-center justify-center">
                    {
                        !mounted ? <div className="text-xs text-muted-foreground">Loading chart...</div> : overview.total_applicants === 0 ? <div className="text-xs text-muted-foreground">No applicants registered yet</div> : <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {
                                        data.map((entry, index) => <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                        )
                                    }
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--background)",
                                        borderColor: "var(--border)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    }
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-center text-xs">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
                        <span className="block text-[10px] text-muted-foreground font-medium">Attended</span>
                        <span className="text-sm font-bold">{overview.total_attended}</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 text-muted-foreground">
                        <span className="block text-[10px] font-medium">Not Attended</span>
                        <span className="text-sm font-bold text-foreground">{overview.total_not_attended}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
