'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database'
import QuestionSection from './QuestionSection'
import RadarChart from '../report/RadarChart'
import CategoryBreakdown from './CategoryBreakdown'
import DiagnosisDetail from './DiagnosisDetail'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Loader2, Radar, CheckCircle2, ArrowLeft, X, Mail, Lock, Phone, User } from 'lucide-react'
import { getStageInfo } from '@/data/feedback'
import { computeSectionScore, calculateTotalScore, getGrade } from '@/lib/scoring-utils'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'

type Question = Database['public']['Tables']['questions']['Row']

interface DiagnosisFormProps {
    questions: Question[]
    userId: string
    profile: any
    isGuest?: boolean
}

export default function DiagnosisForm({ questions, userId, profile, isGuest = false }: DiagnosisFormProps) {
    const router = useRouter()
    const [answers, setAnswers] = useState<Record<string, boolean>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [showRegisterModal, setShowRegisterModal] = useState(false)

    // Registration Form State
    const [regPassword, setRegPassword] = useState('')
    const [regContact, setRegContact] = useState('')
    const [regLoading, setRegLoading] = useState(false)
    const [regError, setRegError] = useState<string | null>(null)

    // Group questions by dimension
    const sections = useMemo(() => {
        const groups: Record<string, Question[]> = {}
        questions.forEach(q => {
            if (!groups[q.dimension]) groups[q.dimension] = []
            groups[q.dimension].push(q)
        })

        // Ensure order D1..D7
        const sectionOrder = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']
        return sectionOrder.map(key => ({
            id: key,
            title: getDimensionTitle(key),
            desc: getDimensionDesc(key),
            maxScore: groups[key]?.reduce((sum, q) => sum + (q.score_weight || 1), 0) || 0,
            questions: groups[key] || []
        })).filter(s => s.questions.length > 0)
    }, [questions])

    // Calculate scores
    const { totalScore, sectionScores, sectionEarnedScores, sectionMaxScores } = useMemo(() => {
        const calculatedSectionScores: Record<string, number> = {}
        const earnedScores: Record<string, number> = {}
        const maxScores: Record<string, number> = {}
        let scoreSum = 0

        sections.forEach(sec => {
            let sectionEarned = 0
            let sectionTotal = 0

            // Map questions to { weight, checked } for utility
            const items = sec.questions.map((q, idx) => {
                const questionKey = `${sec.id}_${idx}`
                const weight = q.score_weight || 1
                const checked = answers[questionKey] === true
                return { weight, checked }
            })

            items.forEach(item => {
                sectionTotal += item.weight
                if (item.checked) {
                    sectionEarned += item.weight
                }
            })

            // Section Score for Radar Chart (0-100%)
            calculatedSectionScores[sec.id] = sectionTotal > 0
                ? (sectionEarned / sectionTotal) * 100
                : 0

            // Raw Scores for Detailed Breakdown
            earnedScores[sec.id] = sectionEarned
            maxScores[sec.id] = sectionTotal

            // Total Score for Result (Sum of all Earned Weights)
            scoreSum += sectionEarned
        })

        return {
            totalScore: scoreSum,
            sectionScores: calculatedSectionScores,
            sectionEarnedScores: earnedScores,
            sectionMaxScores: maxScores
        }
    }, [answers, sections])

    const stageInfo = getStageInfo(totalScore)

    const handleAnswerChange = (questionId: string, checked: boolean) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: checked,
        }))
    }

    const handleSaveClick = () => {
        if (totalScore === 0) {
            alert('최소 1개 이상의 문항에 응답해주세요.')
            return
        }

        if (isGuest) {
            setShowRegisterModal(true)
        } else {
            handleSaveResult(userId)
        }
    }

    const handleRegisterAndSave = async () => {
        if (!regPassword || regPassword.length < 6) {
            setRegError('비밀번호는 6자 이상이어야 합니다.')
            return
        }
        if (!regContact) {
            setRegError('연락처를 입력해주세요.')
            return
        }

        setRegLoading(true)
        setRegError(null)
        const supabase = createClient()

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: profile.email,
                password: regPassword,
                options: {
                    data: {
                        display_name: profile.user_name,
                        contact: regContact
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('회원가입 실패 (User creation failed)')

            // 2. Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email: profile.email,
                    user_name: profile.user_name,
                    company_name: profile.company_name,
                    stage: profile.stage,
                    industry: profile.industry,
                    user_title: profile.user_title,
                    updated_at: new Date().toISOString()
                })

            if (profileError) throw profileError

            // 3. Save Diagnosis Result
            await handleSaveResult(authData.user.id)

            // Clear session guest data
            sessionStorage.removeItem('bizdive_guest')

        } catch (error: any) {
            console.error('Registration/Save Error:', error)

            if (error.message.includes('already registered')) {
                setRegError('이미 가입된 이메일입니다. 로그인 후 이용해주세요.')
            } else {
                setRegError(error.message || '가입 및 저장 중 오류가 발생했습니다.')
            }
            setRegLoading(false)
        }
    }

    const handleSaveResult = async (targetUserId: string) => {
        setIsSaving(true)
        const supabase = createClient()

        try {
            const stageResult = getGrade(totalScore)

            const { data: newDiagnosis, error } = await supabase
                .from('diagnosis_records')
                .insert({
                    user_id: targetUserId,
                    responses: answers,
                    total_score: totalScore,
                    dimension_scores: sectionScores,
                    stage_result: stageResult,

                })
                .select('id')
                .single()

            if (error) throw error

            router.push('/report')
        } catch (error) {
            console.error('Error saving result:', error)
            alert(`저장 중 오류가 발생했습니다: ${(error as any).message || JSON.stringify(error)}`)
            // If failed during register-save, restore loading state
            if (isGuest) setRegLoading(false)
        } finally {
            setIsSaving(false)
        }
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="min-h-screen bg-background">
            {/* Registration Modal for Guest */}
            <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>진단 결과 저장 및 회원가입</DialogTitle>
                        <DialogDescription>
                            진단 결과를 영구 저장하고 리포트를 확인하기 위해<br />
                            비밀번호와 연락처를 설정해주세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-4 rounded-md space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                                <span>이름</span>
                                <span className="font-medium text-foreground">{profile.user_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>이메일</span>
                                <span className="font-medium text-foreground">{profile.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>기업명</span>
                                <span className="font-medium text-foreground">{profile.company_name}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">비밀번호 설정</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="6자 이상 입력"
                                    className="pl-10"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">연락처</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="010-0000-0000"
                                    className="pl-10"
                                    value={regContact}
                                    onChange={(e) => setRegContact(e.target.value)}
                                />
                            </div>
                        </div>

                        {regError && (
                            <div className="text-destructive text-sm bg-destructive/10 p-2 rounded flex items-center gap-2">
                                <X className="h-4 w-4" />
                                {regError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRegisterModal(false)}>취소</Button>
                        <Button
                            onClick={handleRegisterAndSave}
                            disabled={regLoading}
                            className="bg-gradient-primary text-white"
                        >
                            {regLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    저장 중...
                                </>
                            ) : '가입 및 결과 확인'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="mr-2"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <img src="/favicon.png" alt="BizDive" className="w-8 h-8 rounded-lg" />
                        <div>
                            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                                BizDive - 7D 기업경영 심층자가진단
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <span>{profile.company_name || '기업명'} | {profile.user_name || profile.name || '대표자'}</span>
                                <span className="text-muted-foreground/50">|</span>
                                <span>{dateStr}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Questions */}
                    <div className="lg:w-2/3 space-y-6">
                        {/* Intro Card */}
                        <Card className="border-l-4 border-l-primary shadow-soft">
                            <CardContent className="pt-6">
                                <h2 className="text-xl font-bold text-foreground mb-4">진단 안내</h2>
                                <div className="text-muted-foreground text-sm leading-relaxed space-y-3 text-justify">
                                    <p>
                                        본 기업현황 자가진단은 서비스 디자인 방법론(Double Diamond)과 PSST 사업계획 방법론, 전략컨설팅 프레임워크 방법론 등을 융합하여
                                        설계된 고도화된 경영 진단 도구입니다. 시장 기회 탐색부터 사업성 검증까지 7가지 핵심 영역을
                                        입체적으로 정밀 분석합니다.
                                    </p>
                                    <p>
                                        이를 통해 기업은 현재의 성장 단계를 명확히 인지하고, 다음 단계로 도약하기 위한 구체적인
                                        실행 전략을 수립할 수 있습니다.
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                                    <span>※ 총 {questions.length}문항 (100점 만점)</span>
                                    <span>(항목 중요도에 따라 1.0~2.0점 배점 차등 적용)</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Questions */}
                        {sections.map((section, idx) => (
                            <QuestionSection
                                key={section.id}
                                section={section}
                                sectionIndex={idx}
                                answers={answers}
                                onAnswerChange={handleAnswerChange}
                            />
                        ))}

                        {/* Save Result Button Section */}
                        <div className="mt-12 pt-8 border-t border-border">
                            <div className="max-w-xl mx-auto text-center">
                                <h3 className="text-xl font-bold">진단 완료</h3>
                                <p className="text-muted-foreground mt-2 mb-6">
                                    모든 문항에 대한 응답을 마쳤습니다. 결과를 저장하고 맞춤 분석 리포트를 확인하세요.
                                </p>
                                <Button
                                    onClick={handleSaveClick}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto h-12 px-8 bg-gradient-primary text-lg font-bold shadow-lg hover:shadow-primary/40 transition-shadow duration-300"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            저장 중...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            진단 결과 저장하기
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Dashboard */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-24 space-y-6 custom-scrollbar max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-10">
                            {/* Stage Card */}
                            <Card className="bg-primary text-primary-foreground shadow-elevated overflow-hidden border-none text-white">
                                <CardContent className="pt-6 relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-4 -mt-4" />
                                    <div className="relative">
                                        <span className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider">
                                            Current Stage
                                        </span>
                                        <h2 className="text-2xl font-bold mt-1">
                                            {totalScore === 0 ? '진단 대기 중' : stageInfo?.stageName}
                                        </h2>
                                        <p className="text-primary-foreground/80 text-sm mt-1">
                                            {totalScore === 0 ? '좌측 문항에 응답하여 단계 확인' : stageInfo?.shortDesc}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Score Card */}
                            <Card className="shadow-elevated overflow-hidden border-none">
                                <CardContent className="pt-6 relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent rounded-bl-full -mr-4 -mt-4 z-0" />
                                    <div className="relative z-10">
                                        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                            Total Score
                                        </span>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-5xl font-extrabold text-foreground">
                                                {totalScore.toFixed(1)}
                                            </span>
                                            <span className="text-muted-foreground text-lg font-medium">/ 100.0</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-3 mt-4 overflow-hidden">
                                            <div
                                                className="bg-gradient-primary h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(totalScore, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Radar Chart */}
                            <Card className="shadow-card border-border">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Radar className="h-4 w-4 text-primary" />
                                        7-Dimension 밸런스
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <RadarChart sectionScores={sectionScores} />
                                </CardContent>
                            </Card>

                            {/* Diagnosis Detail */}
                            <Card className="bg-slate-900 text-slate-100 shadow-elevated border-slate-800">
                                <CardHeader className="pb-2 border-b border-slate-700">
                                    <CardTitle className="text-sm flex items-center gap-2 text-slate-100">
                                        <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                        상세 진단 결과
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <DiagnosisDetail totalScore={totalScore} />
                                </CardContent>
                            </Card>

                            {/* Category Breakdown */}
                            <Card className="shadow-card border-border">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        항목별 정밀 분석
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CategoryBreakdown
                                        sectionScores={sectionScores}
                                        earnedScores={sectionEarnedScores}
                                        maxScores={sectionMaxScores}
                                        totalScore={totalScore}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

// Helpers for Dimension Info (Mock/Static for now)
function getDimensionTitle(key: string) {
    const titles: Record<string, string> = {
        D1: '시장분석 (Market Analysis)',
        D2: '문제이해 (Problem)',
        D3: '해결가치 (Solution)',
        D4: '실행역량 (ExecutionContext)',
        D5: '기술역량 (Tech/Product)',
        D6: '수익모델 (Business Model)',
        D7: '성장전략 (Growth Strategy)'
    }
    return titles[key] || key
}

function getDimensionDesc(key: string) {
    const descs: Record<string, string> = {
        D1: '시장 규모와 성장성을 분석합니다.',
        D2: '타겟 고객과 문제 정의의 명확성을 점검합니다.',
        D3: '경쟁사 대비 핵심 경쟁력을 진단합니다.',
        D4: '팀 구성과 실행 역량을 평가합니다.',
        D5: '제품/서비스 개발 및 기술 안정성을 확인합니다.',
        D6: '비즈니스 모델과 수익 구조를 분석합니다.',
        D7: '시장 확장 및 스케일업 가능성을 예측합니다.'
    }
    return descs[key] || ''
}
