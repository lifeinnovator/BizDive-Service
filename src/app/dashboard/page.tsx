import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReportHeaderActions } from '@/components/report/ReportActions'
import ConsultantBanner from '@/components/report/ConsultantBanner'
import { Plus, History, ChevronRight, User, Building, Calendar, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getStageInfo } from '@/data/feedback' // Assuming this helper exists and can handle score->stage mapping

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch diagnosis history
    const { data: records } = await supabase
        .from('diagnosis_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="BizDive" className="w-8 h-8 rounded-lg" />
                        <div className="flex flex-col">
                            <h1 className="text-base font-bold text-gray-900 leading-tight">
                                BizDive - 7D 기업경영 심층자가진단
                            </h1>
                            <span className="text-xs text-gray-500 font-medium">
                                {user.email}
                            </span>
                        </div>
                    </div>
                    <ReportHeaderActions />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Hero Banner - Purple Gradient */}
                {/* Hero Banner - Legacy Style */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-10 shadow-lg mb-8 text-white">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-3 leading-tight">
                            비즈니스 성장의 여정, 데이터로 시작하세요.
                        </h2>
                        <p className="text-indigo-100 text-sm mb-6 max-w-2xl leading-relaxed opacity-90">
                            7가지 핵심 차원을 통해 기업의 현재 상태를 입체적으로 분석하고, <br className="hidden sm:block" />
                            다음 단계로 나아가기 위한 구체적인 전략을 발견할 수 있습니다.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/diagnosis">
                                <Button className="h-10 px-5 text-sm bg-white text-indigo-600 hover:bg-indigo-50 font-bold border-none shadow-sm rounded-lg">
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    새 진단 시작하기
                                </Button>
                            </Link>
                            <Link href="/onboarding">
                                <Button variant="outline" className="h-10 px-5 text-sm bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white rounded-lg">
                                    <Settings className="mr-1.5 h-4 w-4" />
                                    기업 정보 관리
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-800">진단 이력</h3>
                </div>

                <div className="space-y-5">
                    {records && records.length > 0 ? (
                        records.map((record: any) => {
                            const stageInfo = getStageInfo(record.total_score)
                            const date = new Date(record.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })

                            return (
                                <Link href={`/report?id=${record.id}`} key={record.id} className="block group">
                                    <Card className="hover:shadow-md transition-all duration-200 border-gray-200 overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="flex items-center h-24">
                                                {/* Score Section - Compact */}
                                                <div className={`w-24 h-full flex flex-col items-center justify-center border-r border-gray-100 bg-gray-50 group-hover:bg-indigo-50/30 transition-colors`}>
                                                    <span className={`text-2xl font-bold ${record.total_score >= 80 ? 'text-green-600' :
                                                        record.total_score >= 50 ? 'text-indigo-600' : 'text-rose-500'
                                                        }`}>
                                                        {record.total_score.toFixed(0)}<span className="text-sm font-normal text-gray-400 ml-0.5">점</span>
                                                    </span>
                                                    <span className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${record.total_score >= 80 ? 'bg-green-100 text-green-700' :
                                                            record.total_score >= 50 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        Stage {record.stage_result}
                                                    </span>
                                                </div>

                                                {/* Content Section - Compact */}
                                                <div className="flex-grow px-5 py-3 flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                                                            {stageInfo.stageName}
                                                        </h4>
                                                        <p className="text-gray-500 text-xs line-clamp-1 mb-2">
                                                            {stageInfo.shortDesc}
                                                        </p>

                                                        {/* Metadata Row */}
                                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                                            <div className="flex items-center gap-1">
                                                                <Building className="h-3 w-3" />
                                                                <span>{record.company_name}</span>
                                                            </div>
                                                            <div className="w-px h-2 bg-gray-300"></div>
                                                            <div className="flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                <span>{profile?.name || '사용자'}</span>
                                                            </div>
                                                            <div className="w-px h-2 bg-gray-300"></div>
                                                            <span>{date}</span>
                                                        </div>
                                                    </div>

                                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 mb-6">
                                <Plus className="h-10 w-10 text-indigo-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">아직 진행된 진단이 없습니다</h3>
                            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                우리 기업의 현재 상태가 궁금하신가요? <br />
                                7가지 차원의 정밀 진단을 시작해보세요.
                            </p>
                            <Link href="/diagnosis">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 h-auto rounded-xl text-lg shadow-lg shadow-indigo-200">
                                    첫 진단 시작하기
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Expert Consultation Banner (Bottom) */}
                <ConsultantBanner />

            </main>
        </div>
    )
}
