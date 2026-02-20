
'use client'

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts'

interface RadarChartProps {
    sectionScores: Record<string, number>;
    previousScores?: Record<string, number>;
}

// Map Dimensions D1-D7 to Names
const DIMENSION_NAMES: Record<string, string> = {
    D1: '시장분석',
    D2: '문제이해',
    D3: '해결가치',
    D4: '실행역량',
    D5: '기술역량',
    D6: '수익모델',
    D7: '성장전략'
}

const SECTIONS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];

export default function DiagnosisRadarChart({ sectionScores, previousScores }: RadarChartProps) {
    const chartData = SECTIONS.map((key) => ({
        subject: DIMENSION_NAMES[key] || key,
        A: sectionScores[key] || 0,
        B: previousScores ? (previousScores[key] || 0) : 0,
        fullMark: 100,
    }))

    return (
        <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="hsl(210, 40%, 90%)" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: 'hsl(215, 25%, 27%)', fontSize: 12, fontWeight: 'bold' }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />

                    {/* Previous Diagnosis (Gray) */}
                    {previousScores && (
                        <Radar
                            name="이전 진단"
                            dataKey="B"
                            stroke="#64748b"
                            fill="#94a3b8"
                            fillOpacity={0.3}
                        />
                    )}

                    {/* Current Diagnosis (Blue/Primary) */}
                    <Radar
                        name="현재 진단"
                        dataKey="A"
                        stroke="hsl(238, 55%, 50%)"
                        fill="hsl(238, 55%, 50%)"
                        fillOpacity={0.4}
                    />

                    {/* Legend-like custom rendering if needed, or rely on tooltip */}
                </RadarChart>
            </ResponsiveContainer>
            {previousScores && (
                <div className="flex justify-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-400/20 border border-slate-400 rounded-full"></div>
                        <span className="text-slate-500">이전 진단</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-indigo-600/40 border border-indigo-600 rounded-full"></div>
                        <span className="text-indigo-700 font-medium">현재 역량</span>
                    </div>
                </div>
            )}
        </div>
    )
}
