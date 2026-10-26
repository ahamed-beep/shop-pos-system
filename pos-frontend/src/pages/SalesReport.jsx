import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api";
import { 
  TrendingUpIcon, 
  DollarSignIcon, 
  PackageIcon, 
  DollarSign, 
  RefreshCcw, 
  ChartBarIcon, 
  Trophy, 
  LayoutGrid, 
  Calendar,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Percent,
  Coins,
  Receipt
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';
import { parseUTCDate } from "../components/SalesRow";

const SalesReport = () => {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [brandStats, setBrandStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Global POS Summary Stats
    const [stats, setStats] = useState({ totalRevenue: 0, saleCount: 0, profit: 0, discount: 0 });
    
    // Udhaar / Credit State & Extended Dual Metrics (All vs Recovered)
    const [udhaarRecords, setUdhaarRecords] = useState([]);
    const [udhaarSearch, setUdhaarSearch] = useState("");
    const [udhaarLimit, setUdhaarLimit] = useState(10); // 10, 20, 50, 'all'
    const [udhaarStats, setUdhaarStats] = useState({ 
        count: 0,
        // Overall / All Credit Metrics
        totalGiven: 0, 
        totalPending: 0, 
        allCreditProfit: 0,
        allCreditDiscount: 0,
        // Recovered Cash Metrics
        totalCollected: 0,
        recoveredProfit: 0,
        recoveredDiscount: 0
    });

    // Charts Data
    const [chartData30D, setChartData30D] = useState([]);
    const [weeklyChartData, setWeeklyChartData] = useState([]);
    
    // Custom Date Range State (YYYY-MM-DD)
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [historyMonths, setHistoryMonths] = useState(null);

    // Initial load: Fetch sales and setup anchor dates
    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                const [salesRes, udhaarRes] = await Promise.all([
                    api.get("/sales"),
                    api.get("/udhaar").catch(() => ({ data: [] }))
                ]);
                
                const rawSales = salesRes.data || [];
                setSales(rawSales);
                setUdhaarRecords(udhaarRes.data || []);

                if (rawSales.length > 0) {
                    const completedSales = rawSales.filter(s => s.status === 'completed');
                    if (completedSales.length > 0) {
                        const timestamps = completedSales.map(s => parseUTCDate(s.sold_at).getTime());
                        const maxDate = new Date(Math.max(...timestamps));
                        const minDate = new Date(Math.min(...timestamps));

                        setEndDate(maxDate.toISOString().split('T')[0]);
                        setStartDate(minDate.toISOString().split('T')[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to initialize sales data", error);
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, []);

    // Fetch Backend Analytics & Udhaar with Date Parameters
    const fetchFilteredStats = useCallback(async (start, end) => {
        if (!start || !end) return;
        try {
            setLoading(true);
            const queryParams = `?startDate=${start}&endDate=${end}`;
            
            const [topRes, brandRes, udhaarRes] = await Promise.all([
                api.get(`/sales/stats/top-products${queryParams}&limit=5`),
                api.get(`/sales/stats/brand${queryParams}`),
                api.get(`/udhaar${queryParams}`).catch(() => ({ data: [] }))
            ]);

            setTopProducts(topRes.data || []);
            setBrandStats(brandRes.data || []);
            if (udhaarRes.data) setUdhaarRecords(udhaarRes.data);
        } catch (error) {
            console.error("Failed to fetch analytical stats", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Synchronously refetch stats when dates change
    useEffect(() => {
        if (startDate && endDate) {
            fetchFilteredStats(startDate, endDate);
        }
    }, [startDate, endDate, fetchFilteredStats]);

    // Fallback Client-Side Brand Calculation
    const computedBrandStats = useMemo(() => {
        if (brandStats.length > 0) return brandStats;
        if (!Array.isArray(sales) || !startDate || !endDate) return [];

        const startBoundary = new Date(startDate);
        startBoundary.setHours(0, 0, 0, 0);
        const endBoundary = new Date(endDate);
        endBoundary.setHours(23, 59, 59, 999);

        const brandMap = {};
        sales.forEach(s => {
            if (s.status === 'refunded') return;
            const saleDate = parseUTCDate(s.sold_at);
            if (saleDate >= startBoundary && saleDate <= endBoundary) {
                const categories = s.categories && s.categories.length > 0 ? s.categories : ['General'];
                categories.forEach(b => {
                    brandMap[b] = (brandMap[b] || 0) + (s.grand_total || 0);
                });
            }
        });

        return Object.keys(brandMap)
            .map(brand => ({ brand, total_revenue: brandMap[brand] }))
            .sort((a, b) => b.total_revenue - a.total_revenue);
    }, [brandStats, sales, startDate, endDate]);

    const handlePresetMonth = (months) => {
        setHistoryMonths(months);
        let anchorEnd = endDate ? new Date(endDate) : new Date();
        if (isNaN(anchorEnd.getTime())) anchorEnd = new Date();

        const anchorStart = new Date(anchorEnd);
        anchorStart.setDate(anchorStart.getDate() - (months * 30));

        setStartDate(anchorStart.toISOString().split('T')[0]);
        setEndDate(anchorEnd.toISOString().split('T')[0]);
    };

    // Calculate main POS sales metrics & chart trends
    useEffect(() => {
        if (!Array.isArray(sales) || sales.length === 0 || !startDate || !endDate) {
            setStats({ totalRevenue: 0, saleCount: 0, profit: 0, discount: 0 });
            setChartData30D([]);
            setWeeklyChartData([]);
            setFilteredSales([]);
            return;
        }

        const startBoundary = new Date(startDate);
        startBoundary.setHours(0, 0, 0, 0);
        const endBoundary = new Date(endDate);
        endBoundary.setHours(23, 59, 59, 999);

        const validSales = sales.filter(s => {
            if (s.status !== 'completed') return false;
            const saleDate = parseUTCDate(s.sold_at);
            return saleDate >= startBoundary && saleDate <= endBoundary;
        });

        const statsCalc = validSales.reduce((acc, s) => {
            const rev = s.grand_total || 0;
            const disc = s.discount || 0;
            const prof = (s.rough_profit || 0) - disc;

            acc.totalRevenue += rev;
            acc.profit += prof;
            acc.discount += disc;
            return acc;
        }, { totalRevenue: 0, profit: 0, discount: 0 });

        setStats({ ...statsCalc, saleCount: validSales.length });

        // Daily Trend Line Chart
        const dailyMap = {};
        const curr = new Date(startBoundary);
        while (curr <= endBoundary) {
            const dateStr = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        validSales.forEach(s => {
            const saleDate = parseUTCDate(s.sold_at);
            const dateStr = saleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (dailyMap[dateStr]) {
                dailyMap[dateStr].revenue += s.grand_total || 0;
                dailyMap[dateStr].profit += (s.rough_profit || 0) - (s.discount || 0);
            }
        });

        setChartData30D(Object.values(dailyMap));

        // Weekly Highlights Bar Chart
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyMap = {};

        for (let i = 6; i >= 0; i--) {
            const d = new Date(endBoundary);
            d.setDate(endBoundary.getDate() - i);
            const dayName = days[d.getDay()];
            weeklyMap[dayName] = { day: dayName, revenue: 0 };
        }

        validSales.forEach((s) => {
            const saleDate = parseUTCDate(s.sold_at);
            const diffDays = Math.floor((endBoundary - saleDate) / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 7) {
                const dayName = days[saleDate.getDay()];
                if (weeklyMap[dayName]) {
                    weeklyMap[dayName].revenue += s.grand_total || 0;
                }
            }
        });

        const orderedWeekly = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(endBoundary);
            d.setDate(endBoundary.getDate() - i);
            orderedWeekly.push(weeklyMap[days[d.getDay()]]);
        }
        setWeeklyChartData(orderedWeekly);

        // Filter Sales Logs
        const lowerSearch = searchTerm.toLowerCase();
        const recordsFiltered = sales.filter(s => {
            if (s.status === 'refunded') return false;
            const saleDate = parseUTCDate(s.sold_at);
            const inDateRange = saleDate >= startBoundary && saleDate <= endBoundary;
            const matchesSearch = s.invoice_no?.toLowerCase().includes(lowerSearch) ||
                                  s.customer_name?.toLowerCase().includes(lowerSearch);
            return inDateRange && matchesSearch;
        });

        setFilteredSales(recordsFiltered);

    }, [sales, startDate, endDate, searchTerm]);

 // Calculate Udhaar Breakdown based strictly on item costs
    useEffect(() => {
        if (!Array.isArray(udhaarRecords)) return;

        const totals = udhaarRecords.reduce(
            (acc, curr) => {
                const totalGiven = curr.total_amount || 0;
                const paid = curr.paid_amount || 0;
                const remaining = curr.remaining_amount || 0;
                const disc = curr.discount || 0;
                const itemCost = curr.total_cost || 0; // Cost from line items sum

                // Profit = Total Given - Item Cost - Discount
                const recordProfit = (totalGiven - itemCost - disc);
                const recoveryRatio = totalGiven > 0 ? (paid / totalGiven) : 0;

                acc.totalGiven += totalGiven;
                acc.totalCollected += paid;
                acc.totalPending += remaining;
                acc.allCreditDiscount += disc;
                acc.allCreditProfit += recordProfit;
                
                // Realized metrics based on recovered cash ratio
                acc.recoveredProfit += (recordProfit * recoveryRatio);
                acc.recoveredDiscount += (disc * recoveryRatio);

                return acc;
            },
            { 
                totalGiven: 0, 
                totalCollected: 0, 
                totalPending: 0, 
                allCreditDiscount: 0, 
                allCreditProfit: 0,
                recoveredProfit: 0,
                recoveredDiscount: 0
            }
        );

        setUdhaarStats({ ...totals, count: udhaarRecords.length });
    }, [udhaarRecords]);
    const handleManualRefresh = async () => {
        try {
            setLoading(true);
            const [salesRes, udhaarRes] = await Promise.all([
                api.get("/sales"),
                api.get("/udhaar").catch(() => ({ data: [] }))
            ]);
            setSales(salesRes.data || []);
            setUdhaarRecords(udhaarRes.data || []);
            await fetchFilteredStats(startDate, endDate);
        } catch (error) {
            console.error("Failed to sync sales data", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and Limit Udhaar Records for Rendering
    const filteredUdhaar = udhaarRecords.filter(u => 
        u.customer_name?.toLowerCase().includes(udhaarSearch.toLowerCase()) ||
        u.customer_phone?.toLowerCase().includes(udhaarSearch.toLowerCase())
    );

    const displayedUdhaar = udhaarLimit === "all" ? filteredUdhaar : filteredUdhaar.slice(0, Number(udhaarLimit));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-10 bg-[#f4f4f4] min-h-screen">
            {/* Top Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-300 shadow-sm">
                <div className="px-2">
                    <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-[#008080]" />
                        Sales Analytics
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-bold italic">POS performance insights and financial reporting</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-[#f4f4f4] p-1 rounded-xl border border-gray-300">
                        {[1, 2, 3].map((m) => (
                            <button
                                key={m}
                                onClick={() => handlePresetMonth(m)}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                    historyMonths === m
                                    ? 'bg-[#001f3f] text-white shadow-md'
                                    : 'text-gray-500 hover:text-[#001f3f]'
                                }`}
                            >
                                {m}M
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-[#f4f4f4] p-1.5 rounded-xl border border-gray-300">
                        <Calendar className="w-4 h-4 text-gray-500 ml-1" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setHistoryMonths(null);
                            }}
                            className="bg-white text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-300 text-[#001f3f] outline-none"
                        />
                        <span className="text-xs font-bold text-gray-500">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setHistoryMonths(null);
                            }}
                            className="bg-white text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-300 text-[#001f3f] outline-none"
                        />
                    </div>

                    <button
                        onClick={handleManualRefresh}
                        className="flex items-center bg-[#001f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-xl active:scale-95 border border-[#001f3f]"
                    >
                        <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} strokeWidth={3} />
                        Sync Data
                    </button>
                </div>
            </div>

            {/* Direct POS Sales Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-300 flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#001f3f] rounded-2xl flex items-center justify-center text-white shrink-0">
                        <TrendingUpIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">POS Sales</p>
                        <h3 className="text-2xl font-black text-[#001f3f]">Rs {stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-300 flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-[#008080] shrink-0 border border-[#008080]/20">
                        <PackageIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Orders Count</p>
                        <h3 className="text-2xl font-black text-[#001f3f]">{stats.saleCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-300 flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-200">
                        <DollarSignIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Direct Profit</p>
                        <h3 className="text-2xl font-black text-amber-600">Rs {stats.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-300 flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200">
                        <DollarSignIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Discounts</p>
                        <h3 className="text-2xl font-black text-emerald-700">Rs {stats.discount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    </div>
                </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-300 flex flex-col h-[400px]">
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5" /> Sales Trend
                        </h2>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={chartData30D}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#001f3f" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#001f3f" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#001f3f" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                <Area type="monotone" dataKey="profit" stroke="#008080" strokeWidth={3} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-300 flex flex-col h-[400px]">
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-[#008080]" /> Weekly Highlights
                        </h2>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#001f3f' }} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: '#f4f4f4', radius: 10 }} />
                                <Bar dataKey="revenue" fill="#001f3f" radius={[10, 10, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Brands, Best Sellers & POS Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-300 h-fit lg:col-span-1">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 border border-orange-200">
                            <LayoutGrid className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#001f3f] uppercase tracking-tight">Brand Sales</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase">Top manufacturers</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {computedBrandStats.length > 0 ? (
                            computedBrandStats.map((brand, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-[#001f3f]">
                                        <span>{brand.brand || 'Other'}</span>
                                        <span>Rs {brand.total_revenue.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-[#008080] h-full transition-all duration-1000"
                                            style={{ width: `${(brand.total_revenue / (stats.totalRevenue || 1) * 100) || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 font-bold italic">No brand data</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-300 h-fit lg:col-span-1">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-50 rounded-2xl text-[#001f3f] border border-blue-200">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#001f3f] uppercase tracking-tight">Best Sellers</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase">Highest volume items</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {topProducts.length > 0 ? (
                            topProducts.map((prod, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                                    <span className="font-black text-[#008080]">#{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[10px] font-black text-[#001f3f] truncate uppercase">{prod.name}</h4>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase">{prod.total_qty} Sold</p>
                                    </div>
                                    <span className="text-[10px] font-black text-[#001f3f]">Rs {(prod.total_revenue / (prod.total_qty || 1)).toLocaleString()} avg</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 font-bold italic">No best sellers</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-300 lg:col-span-1 flex flex-col h-full">
                    <h2 className="text-lg font-black text-[#001f3f] uppercase tracking-tight mb-4">POS Sales History</h2>
                    <input
                        type="text"
                        placeholder="Filter by invoice or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#f4f4f4] border border-gray-300 rounded-2xl px-4 py-3 text-xs font-black text-[#001f3f] outline-none mb-4"
                    />
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-2 no-scrollbar">
                        {filteredSales.length > 0 ? (
                            filteredSales.slice(0, 20).map(sale => (
                                <div key={sale.id} className="p-3 rounded-2xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-[#001f3f]">{sale.invoice_no}</span>
                                        <span className="text-[8px] text-gray-500 font-bold">{sale.customer_name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-[#001f3f]">Rs {sale.grand_total.toFixed(0)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 font-bold italic">No sales logs found</p>
                        )}
                    </div>
                </div>
            </div>

            {/* SEPARATE SECTION: Complete Udhaar / Credit Financials */}
            <div className="bg-white p-8 rounded-3xl border border-gray-300 shadow-md space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-3">
                            <BookOpen className="w-7 h-7 text-[#008080]" />
                            Udhaar / Credit Performance Ledger
                        </h2>
                        <p className="text-xs font-bold text-gray-500 mt-0.5">
                            Dual Breakdown: Credit Metrics "From All Issued" vs "From Recovered Cash"
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search customer or phone..."
                            value={udhaarSearch}
                            onChange={(e) => setUdhaarSearch(e.target.value)}
                            className="bg-[#f4f4f4] border border-gray-300 rounded-xl px-4 py-2 text-xs font-black text-[#001f3f] outline-none"
                        />
                        <div className="flex items-center gap-2 bg-[#f4f4f4] px-3 py-1.5 rounded-xl border border-gray-300">
                            <span className="text-[10px] font-black text-gray-500 uppercase">Show:</span>
                            <select
                                value={udhaarLimit}
                                onChange={(e) => setUdhaarLimit(e.target.value)}
                                className="bg-transparent text-xs font-black text-[#001f3f] outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sub-Section 1: FROM ALL CREDIT (Total Issued Metrics) */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-[#001f3f] uppercase tracking-wider flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        1. Overall Credit Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Credit Accounts</p>
                                <h4 className="text-xl font-black text-[#001f3f] mt-1">{udhaarStats.count} Entries</h4>
                            </div>
                            <Users className="w-7 h-7 text-purple-500 opacity-60" />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Total Credit Given</p>
                                <h4 className="text-xl font-black text-[#001f3f] mt-1">Rs {udhaarStats.totalGiven.toLocaleString()}</h4>
                            </div>
                            <Clock className="w-7 h-7 text-blue-500 opacity-60" />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Total Credit Profit</p>
                                <h4 className="text-xl font-black text-amber-700 mt-1">Rs {udhaarStats.allCreditProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
                            </div>
                            <DollarSignIcon className="w-7 h-7 text-amber-500 opacity-60" />
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Total Credit Discount</p>
                                <h4 className="text-xl font-black text-slate-700 mt-1">Rs {udhaarStats.allCreditDiscount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
                            </div>
                            <Percent className="w-7 h-7 text-slate-500 opacity-60" />
                        </div>
                    </div>
                </div>

                {/* Sub-Section 2: FROM RECOVERED CASH (Actual Collected Realized Metrics) */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        2. Recovered Cash Metrics 
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Recovered Cash</p>
                                <h4 className="text-xl font-black text-emerald-800 mt-1">Rs {udhaarStats.totalCollected.toLocaleString()}</h4>
                            </div>
                            <CheckCircle2 className="w-7 h-7 text-emerald-600 opacity-60" />
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Realized Profit</p>
                                <h4 className="text-xl font-black text-emerald-800 mt-1">Rs {udhaarStats.recoveredProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
                            </div>
                            <DollarSignIcon className="w-7 h-7 text-emerald-600 opacity-60" />
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Realized Discount</p>
                                <h4 className="text-xl font-black text-emerald-800 mt-1">Rs {udhaarStats.recoveredDiscount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
                            </div>
                            <Percent className="w-7 h-7 text-emerald-600 opacity-60" />
                        </div>

                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-wider">Uncollected Debt</p>
                                <h4 className="text-xl font-black text-red-700 mt-1">Rs {udhaarStats.totalPending.toLocaleString()}</h4>
                            </div>
                            <AlertCircle className="w-7 h-7 text-red-500 opacity-60" />
                        </div>
                    </div>
                </div>

                {/* Udhaar Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                    {displayedUdhaar.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 font-bold text-xs">
                            No Udhaar history records found for the selected filter.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#001f3f] text-white text-[10px] font-black uppercase tracking-wider">
                                    <th className="p-3.5 pl-4">Customer</th>
                                    <th className="p-3.5">Total Amount</th>
                                    <th className="p-3.5">Paid Amount</th>
                                    <th className="p-3.5">Remaining</th>
                                    <th className="p-3.5">Borrowed Date</th>
                                    <th className="p-3.5">Last Payment Date</th>
                                    <th className="p-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs font-bold text-[#001f3f]">
                                {displayedUdhaar.map((record) => {
                                    const status = record.computed_status || record.status;
                                    const isPaid = status === 'paid';
                                    const isOverdue = status === 'overdue';
                                    const formattedLastPaid = record.last_paid_date 
                                        ? new Date(record.last_paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                                        : "No payments yet";

                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3.5 pl-4">
                                                <p className="font-black text-[#001f3f]">{record.customer_name}</p>
                                                <p className="text-[10px] text-gray-500">{record.customer_phone || "No phone"}</p>
                                            </td>
                                            <td className="p-3.5 font-bold">Rs {(record.total_amount || 0).toLocaleString()}</td>
                                            <td className="p-3.5 text-emerald-700 font-black">Rs {(record.paid_amount || 0).toLocaleString()}</td>
                                            <td className="p-3.5 text-red-600 font-black">Rs {(record.remaining_amount || 0).toLocaleString()}</td>
                                            <td className="p-3.5 text-[10px] text-gray-500">{record.borrowed_date}</td>
                                            <td className="p-3.5 text-[10px] text-gray-600">{formattedLastPaid}</td>
                                            <td className="p-3.5">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                        isPaid
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : isOverdue
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    }`}
                                                >
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesReport;