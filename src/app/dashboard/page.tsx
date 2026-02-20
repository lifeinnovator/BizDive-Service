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
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                BizDive - 7D 기업경영 심층자가진단
                            </h1>
                        </div>
                    </div>
                    <ReportHeaderActions />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Hero Banner - Purple Gradient */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 px-8 py-14 shadow-2xl mb-12 text-white">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>

                    <div className="relative z-10 max-w-3xl">
                        <Badge className="mb-4 bg-white/20 hover:bg-white/30 text-white border-none px-3 py-1">BizDive 2.0</Badge>
                        <h2 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight">
                            비즈니스 성장의 여정, <br className="hidden sm:block" />
                            <span className="text-purple-200">데이터로 시작하세요.</span>
                        </h2>
                        <p className="text-lg text-indigo-100 max-w-2xl mb-10 leading-relaxed word-keep-all">
                            7가지 핵심 차원을 통해 기업의 현재 상태를 입체적으로 분석하고, 다음 단계로 나아가기 위한 구체적인 전략을 발견할 수 있습니다.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link href="/diagnosis">
                                <Button size="lg" className="h-14 px-8 text-lg bg-white text-indigo-600 hover:bg-indigo-50 font-bold border-none shadow-lg hover:shadow-xl transition-all rounded-xl">
                                    <Plus className="mr-2 h-5 w-5" />
                                    새 진단 시작하기
                                </Button>
                            </Link>
                            <Link href="/onboarding">
                                <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-indigo-800/20 text-white border-white/20 hover:bg-white/10 hover:text-white backdrop-blur-sm rounded-xl transition-all">
                                    <Settings className="mr-2 h-5 w-5" />
                                    설정 및 관리
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                            <History className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">최근 진단 이력</h3>
                    </div>
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
                                    <Card className="hover:shadow-xl transition-all duration-300 border-gray-100 overflow-hidden group-hover:-translate-y-1">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row">
                                                {/* Score Section */}
                                                <div className={`p-6 md:p-8 flex items-center justify-center md:w-48 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 group-hover:bg-indigo-50/30 transition-colors`}>
                                                    <div className="text-center">
                                                        <div className="flex items-baseline justify-center gap-1">
                                                            <span className={`text-5xl font-extrabold tracking-tight ${record.total_score >= 80 ? 'text-green-600' :
                                                                record.total_score >= 50 ? 'text-indigo-600' : 'text-rose-500'
                                                                }`}>
                                                                {record.total_score.toFixed(0)}
                                                            </span>
                                                            <span className="text-gray-400 font-medium text-lg">점</span>
                                                        </div>
                                                        <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.total_score >= 80 ? 'bg-green-100 text-green-800' :
                                                            record.total_score >= 50 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                                                            }`}>
                                                            Stage {record.stage_result}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Content Section */}
                                                <div className="p-6 md:p-8 flex-grow flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
                                                            {stageInfo.stageName}
                                                        </h4>
                                                        <p className="text-gray-600 text-sm mb-5 leading-relaxed max-w-2xl">
                                                            {stageInfo.shortDesc}
                                                        </p>

                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-xs font-medium text-gray-600">
                                                                <Building className="h-3.5 w-3.5 text-gray-400" />
                                                                {record.company_name}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-xs font-medium text-gray-600">
                                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                                {date}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="hidden md:flex ml-6 h-12 w-12 rounded-full bg-gray-50 items-center justify-center text-gray-300 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm">
                                                        <ChevronRight className="h-6 w-6" />
                                                    </div>
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
