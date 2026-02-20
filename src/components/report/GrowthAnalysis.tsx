import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, Trophy, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DiagnosisRecord {
    total_score: number
    dimension_scores: Record<string, number>
    created_at: string
}

interface GrowthAnalysisProps {
    current: DiagnosisRecord
    previous: DiagnosisRecord | null
    maxScores: Record<string, number>
}

const DIMENSION_KR: Record<string, string> = {
    D1: '시장분석',
    D2: '문제이해',
    D3: '해결가치',
    D4: '실행역량',
    D5: '기술역량',
    D6: '수익모델',
    D7: '성장전략'
}

export default function GrowthAnalysis({ current, previous, maxScores }: GrowthAnalysisProps) {
    if (!previous) return null

    const scoreDiff = current.total_score - previous.total_score
    const isPositive = scoreDiff > 0
    // Formatting helper
    const fmt = (num: number) => Math.abs(num).toFixed(1)

    // Calculate dimension differences (Using RAW Scores)
    const dimDiffs = Object.keys(DIMENSION_KR).map(key => {
        const max = maxScores[key] || 15
        const curNorm = current.dimension_scores[key] || 0
        const prevNorm = previous.dimension_scores[key] || 0

        const curRaw = (curNorm / 100) * max
        const prevRaw = (prevNorm / 100) * max // Assumption: Same weight for previous

        return {
            key,
            name: DIMENSION_KR[key],
            current: curRaw,
            previous: prevRaw,
            diff: curRaw - prevRaw
        }
    })

    // Find Max Growth Dimension
    const maxGrowth = dimDiffs.reduce((max, curr) => curr.diff > max.diff ? curr : max, dimDiffs[0])

    // Find Weakest/Declining Area
    // Priority 1: Biggest Drop (Min diff)
    // Priority 2: Lowest Current Score
    const worstArea = dimDiffs.reduce((worst, curr) => {
        if (curr.diff < worst.diff) return curr;
        if (curr.diff === worst.diff && curr.current < worst.current) return curr;
        return worst;
    }, dimDiffs[0]);

    // Count stats
    const improvedCount = dimDiffs.filter(d => d.diff > 0).length
    const declinedCount = dimDiffs.filter(d => d.diff < 0).length

    // Date formatting
    const prevDate = new Date(previous.created_at).toLocaleDateString()

    return (
        <div className="mb-0 bg-white rounded-2xl shadow-lg border border-indigo-50/50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                    <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">성장 분석 (Growth Analysis)</h3>
            </div>

            <div className="p-6 space-y-4">
                {/* 1. Total Score Change Card */}
                <div className={`rounded-xl p-6 border ${isPositive ? 'bg-emerald-50/60 border-emerald-100/50' : 'bg-rose-50/60 border-rose-100/50'}`}>
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            {isPositive ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-rose-500" />}
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-slate-800 mb-1">
                                지난 진단 대비 <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>{fmt(scoreDiff)}점</span> {isPositive ? '상승' : '하락'}
                            </h4>
                            <p className="text-slate-500 font-medium text-sm">
                                {improvedCount}개 영역 개선 · {declinedCount}개 영역 하락
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 2. Max Growth Area Card */}
                    <div className="bg-white rounded-xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full opacity-50"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 flex-shrink-0">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-emerald-600 mb-1">가장 크게 성장한 영역</h4>
                                <div className="text-xl font-bold text-slate-800 mb-2">
                                    {maxGrowth.key === 'D7' ? '7. ' : maxGrowth.key.replace('D', '') + '. '}
                                    {maxGrowth.name}
                                </div>
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    <span className="text-slate-500">{maxGrowth.previous.toFixed(1)}점 → {maxGrowth.current.toFixed(1)}점</span>
                                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">+{maxGrowth.diff.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Area Needing Improvement Card */}
                    <div className="bg-white rounded-xl p-6 border border-rose-100 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full opacity-50"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-3 bg-rose-100 rounded-full text-rose-600 flex-shrink-0">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-rose-600 mb-1">집중 개선이 필요한 영역</h4>
                                <div className="text-xl font-bold text-slate-800 mb-2">
                                    {worstArea.key === 'D7' ? '7. ' : worstArea.key.replace('D', '') + '. '}
                                    {worstArea.name}
                                </div>
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    <span className="text-slate-500">{worstArea.previous.toFixed(1)}점 → {worstArea.current.toFixed(1)}점</span>
                                    <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                                        {worstArea.diff > 0 ? '+' : ''}{worstArea.diff.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Breakdown List (Simple Grid) */}
                <div className="pt-4 border-t border-gray-100">
                    <h5 className="text-sm font-semibold text-slate-400 mb-4">영역별 변화</h5>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {dimDiffs.map(item => (
                            <div key={item.key} className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">{item.name}</span>
                                <span className={`font-bold ${item.diff > 0 ? 'text-emerald-600' :
                                    item.diff < 0 ? 'text-rose-500' : 'text-slate-300'
                                    }`}>
                                    {item.diff > 0 ? '+' : ''}{item.diff.toFixed(1)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
