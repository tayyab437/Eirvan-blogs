import React, { useState } from 'react';
import { PRODUCTS } from '../data/products';
import { Product } from '../types/products';
import { Link } from '../utils/router';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Code2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Lock,
  Download,
  Zap,
  Layers
} from 'lucide-react';

interface ProductsViewProps {
  onSelectProduct: (product: Product) => void;
  onInitiateCheckout: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  onSelectProduct,
  onInitiateCheckout
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filterTabs = [
    { label: 'All Publications & Tools', value: 'all' },
    { label: 'Memberships', value: 'Membership' },
    { label: 'Institutional Dossiers', value: 'Research Dossier' },
    { label: 'Quantitative Code', value: 'Code & Tooling' },
    { label: 'Ergonomic Blueprints', value: 'Blueprint' }
  ];

  const filteredProducts = selectedFilter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === selectedFilter);

  const flagshipProduct = PRODUCTS.find(p => p.id === 'prod-annual-pass') || PRODUCTS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono uppercase tracking-wider font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>EIRVAN Institutional Intelligence Store</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight text-balance">
          Peer-Reviewed Monograph Dossiers &amp; Algorithmic Tooling
        </h1>
        <p className="text-base text-slate-600 font-sans leading-relaxed">
          Acquire unredacted deep-tech research dossiers, low-latency market execution frameworks, and biological protocol templates engineered for institutional analysts and high-output builders.
        </p>
      </div>

      {/* Flagship Hero Card */}
      {flagshipProduct && (
        <section aria-label="Flagship Membership Offer" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-10 shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-cyan-400 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider">
                  {flagshipProduct.badge || 'Flagship'}
                </span>
                <span className="text-xs font-mono text-cyan-200">
                  {flagshipProduct.format}
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
                  {flagshipProduct.title}
                </h2>
                <p className="text-cyan-100/90 text-sm sm:text-base mt-2 font-sans">
                  {flagshipProduct.subtitle}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {flagshipProduct.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-serif font-black text-white">${flagshipProduct.price}</span>
                  <span className="text-xs text-slate-400 font-mono">/ year</span>
                  {flagshipProduct.originalPrice && (
                    <span className="text-sm text-slate-400 line-through font-mono ml-2">${flagshipProduct.originalPrice}</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onInitiateCheckout(flagshipProduct)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Instant Pro Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectProduct(flagshipProduct)}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase tracking-wider font-semibold border border-white/15 transition-all cursor-pointer"
                  >
                    View Specs
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="aspect-4/3 rounded-2xl overflow-hidden border border-white/15 shadow-2xl relative group">
                <img
                  src={flagshipProduct.featuredImage}
                  alt={flagshipProduct.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-xs">
                  <div className="flex items-center justify-between text-cyan-300 font-mono font-bold">
                    <span>Includes 2026 Archive</span>
                    <span>100% Tax Deductible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter Chips */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredProducts.length} items
        </span>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map(product => {
          const isMembership = product.category === 'Membership';
          const icon = product.category === 'Code & Tooling'
            ? <Code2 className="w-4 h-4 text-indigo-500" />
            : product.category === 'Research Dossier'
            ? <FileText className="w-4 h-4 text-blue-500" />
            : <Layers className="w-4 h-4 text-cyan-500" />;

          return (
            <div
              key={product.id}
              className="group bg-white rounded-3xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
            >
              {/* Product Image */}
              <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                <img
                  src={product.featuredImage}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-mono font-bold flex items-center gap-1.5">
                    {icon}
                    <span>{product.category}</span>
                  </span>
                  {product.badge && (
                    <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-mono font-bold">
                      {product.badge}
                    </span>
                  )}
                </div>
                {product.pageCount && (
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-mono">
                    {product.pageCount} Pages
                  </div>
                )}
              </div>

              {/* Product Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    {product.format}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    <Link href={`/product/${product.slug}`} className="hover:underline">
                      {product.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {product.highlights.slice(0, 3).map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="truncate">{h}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-serif font-black text-slate-900">${product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-slate-400 line-through font-mono">${product.originalPrice}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 block">Instant Download · DRM Free</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/product/${product.slug}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Preview
                    </Link>
                    <button
                      onClick={() => onInitiateCheckout(product)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                    >
                      <span>Buy</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Box */}
      <div className="p-8 rounded-3xl bg-slate-100/80 border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-center sm:text-left">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white shadow-xs text-blue-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">Institutional Citations</h4>
            <p className="text-xs text-slate-600 mt-1">All datasets and claims backed by peer-reviewed literature and verifiable foundry filings.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white shadow-xs text-indigo-600 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">256-Bit SSL Encrypted Checkout</h4>
            <p className="text-xs text-slate-600 mt-1">Stripe-grade and Web3 USDC settlement with instantaneous receipt and digital dispatch.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white shadow-xs text-emerald-600 shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-slate-900 text-sm">Immediate Digital Access</h4>
            <p className="text-xs text-slate-600 mt-1">Instant DRM-free PDF, GitHub repository invites, and high-resolution chart appendices.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
