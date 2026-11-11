import React from 'react';
import { Product } from '../types/products';
import { Link } from '../utils/router';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Share2
} from 'lucide-react';

interface ProductDetailViewProps {
  product: Product;
  onInitiateCheckout: (product: Product) => void;
  onBack: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onInitiateCheckout,
  onBack
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb Nav */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Link href="/" className="hover:text-blue-600 transition-colors">EIRVAN</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600 transition-colors">Products</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">{product.title}</span>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{copied ? 'URL Copied!' : 'Share Product'}</span>
        </button>
      </nav>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Product Images & Specs */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold uppercase tracking-wider">
                {product.category}
              </span>
              {product.badge && (
                <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 text-xs font-mono font-bold uppercase tracking-wider">
                  {product.badge}
                </span>
              )}
              <span className="text-xs font-mono text-slate-500 ml-auto flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Updated 2026 Edition
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-slate-900 tracking-tight leading-tight">
              {product.title}
            </h1>
            <p className="text-slate-600 font-sans text-base leading-relaxed">
              {product.subtitle}
            </p>
          </div>

          {/* Product Image */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md aspect-16/10 relative bg-slate-950">
            <img
              src={product.featuredImage}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-mono">
              <span className="bg-slate-900/80 px-3 py-1 rounded-md backdrop-blur-md">
                Format: {product.format}
              </span>
              {product.pageCount && (
                <span className="bg-slate-900/80 px-3 py-1 rounded-md backdrop-blur-md">
                  {product.pageCount} Pages
                </span>
              )}
            </div>
          </div>

          {/* Detailed Description */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-xl font-serif font-bold text-slate-900">Executive Briefing &amp; Scope</h2>
            <p className="text-slate-700 leading-relaxed font-sans text-sm sm:text-base">
              {product.longDescription}
            </p>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-500 font-bold">Key Technical Deliverables</h3>
              <div className="space-y-2.5">
                {product.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table of Contents */}
            {product.tableOfContents && product.tableOfContents.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Table of Contents &amp; Modules
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                  {product.tableOfContents.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-mono text-slate-700 py-1 border-b border-slate-200/60 last:border-0">
                      <span className="text-blue-600 font-bold">{String(idx + 1).padStart(2, '0')}.</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky Checkout Action Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-6">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-500 font-mono block">One-Time Institutional License</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-serif font-black text-slate-900">${product.price}</span>
                  {product.originalPrice && (
                    <span className="text-base text-slate-400 line-through font-mono">${product.originalPrice}</span>
                  )}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold">
                Instant Fulfillment
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="font-mono text-slate-500">License Type:</span>
                <span className="font-semibold text-slate-800">Commercial / Institutional</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="font-mono text-slate-500">Delivery:</span>
                <span className="font-semibold text-slate-800">Direct Download &amp; Email Dispatch</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="font-mono text-slate-500">Updates Included:</span>
                <span className="font-semibold text-slate-800">Lifetime 2026 Errata &amp; Revisions</span>
              </div>
            </div>

            <button
              onClick={() => onInitiateCheckout(product)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>Proceed to Checkout</span>
            </button>

            <div className="space-y-2 pt-2 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>256-Bit SSL Encrypted Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>30-Day Research Accuracy Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Includes Tax Invoice for Corporate Expensing</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <Link
              href="/products"
              className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Publications</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
