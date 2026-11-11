import React, { useState, useEffect } from 'react';
import { Product, CheckoutStep, CheckoutCustomerInfo, CheckoutPaymentInfo, OrderConfirmation } from '../types/products';
import { PRODUCTS } from '../data/products';
import { navigate, Link } from '../utils/router';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Building,
  Mail,
  User,
  MapPin,
  Download,
  Sparkles,
  ShoppingBag,
  Zap,
  Globe,
  Tag
} from 'lucide-react';

interface CheckoutViewProps {
  initialStep: CheckoutStep;
  selectedProductSlug?: string;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  initialStep,
  selectedProductSlug
}) => {
  // Find product from slug or default to flagship pass
  const [selectedProduct, setSelectedProduct] = useState<Product>(() => {
    if (selectedProductSlug) {
      const match = PRODUCTS.find(p => p.slug === selectedProductSlug);
      if (match) return match;
    }
    return PRODUCTS[0];
  });

  const [quantity, setQuantity] = useState<number>(1);
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promoAppliedMessage, setPromoAppliedMessage] = useState<string>('');

  const [customerInfo, setCustomerInfo] = useState<CheckoutCustomerInfo>({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    address: '100 Montgomery St, Suite 1200',
    city: 'San Francisco',
    country: 'United States',
    postalCode: '94104',
    vatNumber: ''
  });

  const [paymentInfo, setPaymentInfo] = useState<CheckoutPaymentInfo>({
    method: 'card',
    cardholderName: '',
    cardNumber: '•••• •••• •••• 4242',
    expiry: '12/28',
    cvc: '888'
  });

  const [completedOrder, setCompletedOrder] = useState<OrderConfirmation | null>(() => {
    try {
      const saved = localStorage.getItem('eirvan_last_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Update selected product if slug prop changes
  useEffect(() => {
    if (selectedProductSlug) {
      const match = PRODUCTS.find(p => p.slug === selectedProductSlug);
      if (match) setSelectedProduct(match);
    }
  }, [selectedProductSlug]);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (clean === 'ALPHA20' || clean === 'RESEARCH20') {
      setDiscountPercent(20);
      setPromoAppliedMessage('20% Institutional Discount Applied!');
      setErrorMsg('');
    } else if (clean === 'EIRVAN10') {
      setDiscountPercent(10);
      setPromoAppliedMessage('10% Welcome Discount Applied!');
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid promo code. Try ALPHA20 for 20% off.');
      setPromoAppliedMessage('');
    }
  };

  const rawSubtotal = selectedProduct.price * quantity;
  const discountAmount = Number(((rawSubtotal * discountPercent) / 100).toFixed(2));
  const subtotalAfterDiscount = rawSubtotal - discountAmount;
  const estimatedTax = Number((subtotalAfterDiscount * 0.08).toFixed(2));
  const finalTotal = Number((subtotalAfterDiscount + estimatedTax).toFixed(2));

  const stepsList: { id: CheckoutStep; label: string; url: string }[] = [
    { id: 'cart', label: '1. Review Plan', url: `/checkout?product=${selectedProduct.slug}` },
    { id: 'details', label: '2. Customer Info', url: `/checkout/details?product=${selectedProduct.slug}` },
    { id: 'payment', label: '3. Secure Payment', url: `/checkout/payment?product=${selectedProduct.slug}` },
    { id: 'confirmation', label: '4. Confirmation', url: `/checkout/confirmation` }
  ];

  const handleGoToDetails = () => {
    navigate(`/checkout/details?product=${selectedProduct.slug}`);
  };

  const handleGoToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.email || !customerInfo.firstName || !customerInfo.lastName) {
      setErrorMsg('Please provide your email and full name to continue.');
      return;
    }
    setErrorMsg('');
    navigate(`/checkout/payment?product=${selectedProduct.slug}`);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsProcessing(false);
      const newOrder: OrderConfirmation = {
        orderId: `EIR-${Math.floor(100000 + Math.random() * 900000)}-PRO`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        customer: customerInfo,
        items: [
          {
            product: selectedProduct,
            quantity,
            subtotal: rawSubtotal
          }
        ],
        discount: discountAmount,
        tax: estimatedTax,
        total: finalTotal,
        paymentMethod: paymentInfo.method === 'card' ? 'Visa / Mastercard (•••• 4242)' : paymentInfo.method === 'crypto' ? 'USDC Settlement' : 'Digital Wallet',
        downloadToken: `DL-EIRVAN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };

      setCompletedOrder(newOrder);
      try {
        localStorage.setItem('eirvan_last_order', JSON.stringify(newOrder));
      } catch {}

      navigate('/checkout/confirmation');
    }, 750);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Checkout Progress Stepper with Explicit URL Badges */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stepsList.map((step, idx) => {
            const isCurrent = initialStep === step.id;
            const isPassed =
              (initialStep === 'details' && step.id === 'cart') ||
              (initialStep === 'payment' && (step.id === 'cart' || step.id === 'details')) ||
              (initialStep === 'confirmation');

            return (
              <div
                key={step.id}
                onClick={() => {
                  if (isPassed && step.id !== 'confirmation') {
                    navigate(step.url);
                  }
                }}
                className={`p-3 rounded-2xl border transition-all text-left ${
                  isCurrent
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs text-blue-900 font-bold'
                    : isPassed
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-700 cursor-pointer hover:bg-emerald-50'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="truncate">{step.label}</span>
                  {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {step.url.split('?')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: REVIEW CART / PLAN (/checkout) */}
      {initialStep === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">Step 1 of 4</span>
                <h1 className="text-2xl font-serif font-black text-slate-900">Review Selection</h1>
              </div>
              <span className="text-xs font-mono text-slate-400">URL: /checkout</span>
            </div>

            {/* Selected Product Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <img
                src={selectedProduct.featuredImage}
                alt={selectedProduct.title}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    {selectedProduct.category}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{selectedProduct.format}</span>
                </div>
                <h2 className="text-base font-serif font-bold text-slate-900 leading-snug">
                  {selectedProduct.title}
                </h2>
                <p className="text-xs text-slate-500 line-clamp-1">{selectedProduct.subtitle}</p>
              </div>
              <div className="text-right sm:pl-4">
                <span className="text-xl font-serif font-black text-slate-900">${selectedProduct.price}</span>
                {selectedProduct.originalPrice && (
                  <span className="text-xs text-slate-400 line-through block font-mono">
                    ${selectedProduct.originalPrice}
                  </span>
                )}
              </div>
            </div>

            {/* Alternative Product Switcher */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Switch or Select Alternative Research Dossier:
              </label>
              <select
                aria-label="Select alternative publication"
                value={selectedProduct.id}
                onChange={(e) => {
                  const match = PRODUCTS.find(p => p.id === e.target.value);
                  if (match) {
                    setSelectedProduct(match);
                    navigate(`/checkout?product=${match.slug}`, { replace: true, scroll: false });
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {PRODUCTS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} — ${p.price} ({p.format})
                  </option>
                ))}
              </select>
            </div>

            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="pt-4 border-t border-slate-100 flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Promo code (e.g. ALPHA20)"
                  aria-label="Promotional Code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Apply
              </button>
            </form>
            {promoAppliedMessage && (
              <p className="text-xs text-emerald-600 font-medium">{promoAppliedMessage}</p>
            )}

            <div className="pt-4 flex items-center justify-between">
              <Link href="/products" className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Store</span>
              </Link>
              <button
                onClick={handleGoToDetails}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                <span>Continue to Customer Info</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-900 border-b border-slate-100 pb-3">Order Breakdown</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">${rawSubtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (8%):</span>
                <span className="font-mono">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-serif font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>Total Due:</span>
                <span className="font-mono text-blue-600">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1.5 font-mono">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Guaranteed Institutional Deliverables</span>
              </div>
              <p>Includes complete high-resolution figures, editable datasets, and tax-compliant commercial licensing.</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CUSTOMER & BILLING INFO (/checkout/details) */}
      {initialStep === 'details' && (
        <form onSubmit={handleGoToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">Step 2 of 4</span>
                <h1 className="text-2xl font-serif font-black text-slate-900">Customer &amp; Billing Details</h1>
              </div>
              <span className="text-xs font-mono text-slate-400">URL: /checkout/details</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                  Work / Personal Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="analyst@firm.com"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">Your license key and download link will be dispatched here.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                    Company / Organization (Optional)
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Apex Quantitative Capital"
                      value={customerInfo.company}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, company: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                    VAT / Tax Exemption ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="US-EIN or EU-VAT"
                    value={customerInfo.vatNumber}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, vatNumber: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                  Billing Street Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={customerInfo.postalCode}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, postalCode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">Country</label>
                  <input
                    type="text"
                    value={customerInfo.country}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, country: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(`/checkout?product=${selectedProduct.slug}`)}
                className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Cart</span>
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-900 border-b border-slate-100 pb-3">Selected Plan</h3>
            <div className="text-xs space-y-1">
              <div className="font-semibold text-slate-900">{selectedProduct.title}</div>
              <div className="text-slate-500 font-mono">{selectedProduct.format}</div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline font-serif">
              <span className="text-xs font-mono uppercase text-slate-500">Total:</span>
              <span className="text-2xl font-black text-blue-600 font-mono">${finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </form>
      )}

      {/* STEP 3: SECURE PAYMENT (/checkout/payment) */}
      {initialStep === 'payment' && (
        <form onSubmit={handleExecutePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">Step 3 of 4</span>
                <h1 className="text-2xl font-serif font-black text-slate-900">Select Payment Method</h1>
              </div>
              <span className="text-xs font-mono text-slate-400">URL: /checkout/payment</span>
            </div>

            {/* Payment Mode Selector */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'card', label: 'Credit Card', icon: CreditCard },
                { id: 'apple-pay', label: 'Digital Wallet', icon: Zap },
                { id: 'crypto', label: 'USDC Web3', icon: Globe }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPaymentInfo({ ...paymentInfo, method: mode.id as any })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentInfo.method === mode.id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <mode.icon className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <span className="text-xs">{mode.label}</span>
                </button>
              ))}
            </div>

            {paymentInfo.method === 'card' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                    Cardholder Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={paymentInfo.cardholderName || (customerInfo.firstName ? `${customerInfo.firstName} ${customerInfo.lastName}` : 'Jane Doe')}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, cardholderName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={paymentInfo.cardNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                      Expiration (MM/YY)
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentInfo.expiry}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, expiry: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 font-bold mb-1">
                      Security CVC
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={paymentInfo.cvc}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cvc: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentInfo.method === 'apple-pay' && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <Zap className="w-8 h-8 text-blue-600 mx-auto" />
                <h4 className="font-serif font-bold text-slate-900 text-sm">Instant Express Checkout</h4>
                <p className="text-xs text-slate-500">Biometric Touch ID / Face ID payment will trigger when you click Authorize.</p>
              </div>
            )}

            {paymentInfo.method === 'crypto' && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 font-mono">
                <Globe className="w-8 h-8 text-indigo-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-xs">USDC Settlement on Solana / Base</h4>
                <p className="text-[11px] text-slate-500">Zero transaction fees. Immediate digital token dispatch upon transaction block finality.</p>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(`/checkout/details?product=${selectedProduct.slug}`)}
                className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Customer Info</span>
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer hover:scale-[1.01] disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-cyan-300" />
                <span>{isProcessing ? 'Authorizing Payment...' : `Complete Payment ($${finalTotal.toFixed(2)})`}</span>
              </button>
            </div>
          </div>

          {/* Right Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-900 border-b border-slate-100 pb-3">Final Order Review</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Product:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[200px]">{selectedProduct.title}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Email:</span>
                <span className="font-mono text-slate-900">{customerInfo.email || 'analyst@firm.com'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">${rawSubtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax:</span>
                <span className="font-mono">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-serif font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono text-blue-600">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* STEP 4: ORDER CONFIRMATION (/checkout/confirmation) */}
      {initialStep === 'confirmation' && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-lg text-center space-y-8">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 font-bold">
              Transaction Approved · Institutional License Issued
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-slate-900">
              Thank You for Your Order
            </h1>
            <p className="text-slate-600 text-sm max-w-lg mx-auto">
              Your order confirmation and digital materials have been processed. Direct downloads and tax invoices are available immediately below.
            </p>
          </div>

          {completedOrder && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-4 text-xs font-mono">
              <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Order Reference</span>
                  <span className="text-sm font-bold text-slate-900">{completedOrder.orderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date of Transaction</span>
                  <span className="text-slate-700">{completedOrder.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Method</span>
                  <span className="text-slate-700">{completedOrder.paymentMethod}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {completedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-sans font-semibold text-slate-900 text-sm">{it.product.title}</span>
                    <span className="font-bold text-slate-900">${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700">${completedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                alert(`Instant download triggered! Token: ${completedOrder?.downloadToken || 'DL-EIRVAN-84920'}. Generating 2026 DRM-Free PDF and repository access.`);
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              <span>Download Monograph / Access Portal</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Return to Intelligence Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-100 pt-6">
            Permanent URL: <span className="text-slate-600">https://eirvan.com/checkout/confirmation</span> · Questions? Contact <span className="text-blue-600">billing@eirvan.com</span>
          </div>
        </div>
      )}
    </div>
  );
};
