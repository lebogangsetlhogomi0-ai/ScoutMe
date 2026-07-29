import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "./Toast";
import { X, Check, Shield, CreditCard, Landmark, CheckCircle, Sparkles, AlertCircle } from "lucide-react";

export const PRICING = {
  PLAYER_PRO: {
    id: "player_pro",
    name: "Player Pro",
    price: "R49",
    period: "month",
    features: [
      "🔥 Verified Golden Scout Radar placement",
      "📊 Direct Position Benchmarking vs all players",
      "📤 High-resolution PDF/PNG report downloads",
      "🎥 Priority video clip rendering & encoding",
      "💬 Unlimited messages to PSL Academy Scouts"
    ]
  },
  SCOUT_PRO: {
    id: "scout_pro",
    name: "Scout Pro",
    price: "R299",
    period: "month",
    features: [
      "👁️ Access to all Grassroots Match Clips",
      "📌 Unlimited Scout Stamps (Gold Diamond tags)",
      "📞 Direct contact details for player guardians",
      "📈 Export advanced CSV/Excel player dossiers",
      "🤖 Advanced AI Neural Scout query limit (Unlimited)"
    ]
  }
};

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: "player_pro" | "scout_pro";
}

export const PaymentsModal: React.FC<PaymentsModalProps> = ({ isOpen, onClose, defaultTier }) => {
  const { upgradeUserTier, currentUser } = useApp();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"player_pro" | "scout_pro">(
    defaultTier || (currentUser?.role === "scout" || currentUser?.role === "club" ? "scout_pro" : "player_pro")
  );
  const [paymentStep, setPaymentStep] = useState<"plans" | "method" | "processing" | "success">("plans");
  const [paymentMethod, setPaymentMethod] = useState<"ozow" | "payfast">("ozow");
  const [eftBank, setEftBank] = useState<string>("capitec");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  if (!isOpen) return null;

  const activePlan = selectedPlan === "player_pro" ? PRICING.PLAYER_PRO : PRICING.SCOUT_PRO;

  const handleNextToPayment = () => {
    setPaymentStep("method");
  };

  const handleStartPayment = () => {
    if (paymentMethod === "payfast" && (!cardNumber || !cardExpiry || !cardCvv)) {
      showToast("Please fill in your simulated card details.", "error");
      return;
    }
    setPaymentStep("processing");

    // Simulate 2.5 seconds processing
    setTimeout(async () => {
      try {
        await upgradeUserTier(selectedPlan);
        setPaymentStep("success");
      } catch (err) {
        console.error(err);
        showToast("Simulated transaction failed. Please retry.", "error");
        setPaymentStep("method");
      }
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050e08]/90 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0a1a0f] border border-[#1a3825] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Close Button */}
        {paymentStep !== "processing" && paymentStep !== "success" && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[#5a8a6a] hover:text-white p-1 rounded-full hover:bg-[#1a3825] transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* STEP 1: PLANS SELECTION */}
        {paymentStep === "plans" && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest text-[#00e56b] font-mono">
                UPGRADE PLATFORM ACCESS
              </span>
              <h3 className="text-2xl font-black font-bebas text-white tracking-wide">
                UNLOCK SCOUTME PRO
              </h3>
              <p className="text-xs text-[#5a8a6a]">
                Choose the subscription tier engineered for your pathway
              </p>
            </div>

            {/* Plan selector cards */}
            <div className="space-y-3.5">
              {/* Player Pro */}
              <div 
                onClick={() => setSelectedPlan("player_pro")}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex justify-between items-start relative overflow-hidden ${
                  selectedPlan === "player_pro" 
                    ? "bg-[#0f2318] border-[#00e56b] shadow-lg shadow-[#00e56b]/10" 
                    : "bg-[#050e08] border-[#1a3825] hover:border-[#1a3825]/80"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">Player Pro</span>
                    <span className="bg-[#00e56b]/20 text-[#00e56b] text-[9px] px-1.5 py-0.5 rounded font-black font-mono">POPULAR</span>
                  </div>
                  <p className="text-[11px] text-[#5a8a6a]">Best for Grassroots Players seeking exposure</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#00e56b] font-mono">R49</span>
                  <span className="text-[10px] text-[#5a8a6a] block">/ month</span>
                </div>
              </div>

              {/* Scout Pro */}
              <div 
                onClick={() => setSelectedPlan("scout_pro")}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex justify-between items-start relative overflow-hidden ${
                  selectedPlan === "scout_pro" 
                    ? "bg-[#231e0f] border-[#f5c518] shadow-lg shadow-[#f5c518]/10" 
                    : "bg-[#050e08] border-[#1a3825] hover:border-[#1a3825]/80"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">Scout Pro</span>
                    <span className="bg-[#f5c518]/20 text-[#f5c518] text-[9px] px-1.5 py-0.5 rounded font-black font-mono">ELITE</span>
                  </div>
                  <p className="text-[11px] text-[#5a8a6a]">For PSL Coaches, Academy Scouts & Clubs</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#f5c518] font-mono">R299</span>
                  <span className="text-[10px] text-[#5a8a6a] block">/ month</span>
                </div>
              </div>
            </div>

            {/* Selected Plan Features */}
            <div className="bg-[#050e08]/90 border border-[#1a3825]/60 rounded-xl p-4.5 space-y-3">
              <span className="text-[10px] font-black tracking-wider text-[#5a8a6a] block uppercase font-mono">
                What's included in {activePlan.name} ◆
              </span>
              <ul className="space-y-2">
                {activePlan.features.map((feat, i) => (
                  <li key={i} className="flex items-start space-x-2.5 text-xs text-[#e8f5ee]">
                    <span className="text-[#00e56b] shrink-0 font-bold mt-0.5">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade CTA */}
            <button
              onClick={handleNextToPayment}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 text-[#050e08] shadow-lg cursor-pointer ${
                selectedPlan === "player_pro" ? "bg-[#00e56b] hover:bg-[#00c75c]" : "bg-[#f5c518] hover:bg-[#ddb010]"
              }`}
            >
              Continue with {activePlan.name} (R{activePlan.price.replace("R", "")}/mo)
            </button>

            <div className="flex items-center justify-center space-x-2 text-[10px] text-[#5a8a6a]">
              <Shield className="w-3.5 h-3.5" />
              <span>Safe, secure & encrypted South African payment processing</span>
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT METHOD SELECTION */}
        {paymentStep === "method" && (
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-[#00e56b] font-mono">
                SECURE CHECKOUT
              </span>
              <h3 className="text-xl font-black font-bebas text-white tracking-wide">
                SELECT PAYMENT METHOD
              </h3>
              <p className="text-xs text-[#5a8a6a]">
                Processing payment of <strong className="text-white">{activePlan.price}</strong> for {activePlan.name}
              </p>
            </div>

            {/* Method Toggles */}
            <div className="grid grid-cols-2 gap-3">
              {/* Ozow Instant EFT */}
              <button 
                onClick={() => setPaymentMethod("ozow")}
                className={`py-3.5 px-3 rounded-xl border-2 font-bold text-[11px] uppercase transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                  paymentMethod === "ozow" 
                    ? "bg-[#0f2318] border-[#00e56b] text-[#00e56b]" 
                    : "bg-[#050e08] border-[#1a3825] text-stone-400"
                }`}
              >
                <Landmark className="w-5 h-5" />
                <span>Ozow EFT</span>
                <span className="text-[8px] text-[#5a8a6a] lowercase font-mono">instant bank login</span>
              </button>

              {/* PayFast Card */}
              <button 
                onClick={() => setPaymentMethod("payfast")}
                className={`py-3.5 px-3 rounded-xl border-2 font-bold text-[11px] uppercase transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                  paymentMethod === "payfast" 
                    ? "bg-[#0f2318] border-[#00e56b] text-[#00e56b]" 
                    : "bg-[#050e08] border-[#1a3825] text-stone-400"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>PayFast</span>
                <span className="text-[8px] text-[#5a8a6a] lowercase font-mono">visa/master/capitec</span>
              </button>
            </div>

            {/* Form details conditional on method */}
            {paymentMethod === "ozow" ? (
              <div className="bg-[#050e08] border border-[#1a3825] rounded-xl p-4 space-y-3">
                <span className="text-[9.5px] font-black text-[#5a8a6a] uppercase font-mono tracking-wider">
                  🔐 Ozow Instant EFT Bank Login (Simulation)
                </span>
                <div className="space-y-2">
                  <label className="text-[10px] text-[#5a8a6a] block">SELECT YOUR SOUTH AFRICAN BANK</label>
                  <select 
                    value={eftBank}
                    onChange={(e) => setEftBank(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-lg p-2.5 text-xs text-white outline-none"
                  >
                    <option value="capitec">Capitec Bank</option>
                    <option value="fnb">First National Bank (FNB)</option>
                    <option value="standard">Standard Bank</option>
                    <option value="absa">ABSA</option>
                    <option value="nedbank">Nedbank</option>
                    <option value="tyme">TymeBank</option>
                  </select>
                </div>
                <div className="flex items-start space-x-2 text-[10.5px] text-[#5a8a6a]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#00e56b] shrink-0 mt-0.5" />
                  <span>Logged in directly via secure banking systems. Zero credential storing.</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#050e08] border border-[#1a3825] rounded-xl p-4 space-y-3">
                <span className="text-[9.5px] font-black text-[#5a8a6a] uppercase font-mono tracking-wider">
                  💳 PayFast Card Details (Simulation)
                </span>
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#5a8a6a] uppercase">CARD NUMBER</label>
                    <input 
                      type="text"
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-lg p-2.5 text-xs text-white outline-none placeholder-stone-600 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5a8a6a] uppercase">EXPIRY DATE</label>
                      <input 
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-lg p-2.5 text-xs text-white outline-none placeholder-stone-600 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5a8a6a] uppercase">CVV</label>
                      <input 
                        type="password"
                        placeholder="123"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-lg p-2.5 text-xs text-white outline-none placeholder-stone-600 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Back & Pay buttons */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => setPaymentStep("plans")}
                className="py-3.5 bg-transparent border border-[#1a3825] text-[#5a8a6a] rounded-xl font-bold text-xs uppercase tracking-wider text-center cursor-pointer hover:bg-[#1a3825]/40"
              >
                Back
              </button>
              <button
                onClick={handleStartPayment}
                className="col-span-2 py-3.5 bg-[#00e56b] hover:bg-[#00c75c] text-[#050e08] rounded-xl font-bold text-xs uppercase tracking-wider text-center cursor-pointer shadow-lg shadow-[#00e56b]/10"
              >
                Pay {activePlan.price} Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSING PAYMENT */}
        {paymentStep === "processing" && (
          <div className="p-8 flex flex-col items-center justify-center space-y-6 text-center min-h-[360px]">
            <div className="relative">
              {/* Spinning Ring */}
              <div className="w-16 h-16 rounded-full border-4 border-[#1a3825] border-t-[#00e56b] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">🇿🇦</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black font-bebas text-white tracking-wider uppercase animate-pulse">
                Processing Secure Payment...
              </h4>
              <p className="text-xs text-[#5a8a6a] max-w-[280px] mx-auto leading-relaxed">
                Interfacing with {paymentMethod === "ozow" ? `Ozow Instant EFT via ${eftBank.toUpperCase()}` : "PayFast secure card servers"}...
              </p>
            </div>
            <p className="text-[10px] text-[#5a8a6a]/60 font-mono">
              Do not refresh or exit the page
            </p>
          </div>
        )}

        {/* STEP 4: PAYMENT SUCCESSFUL */}
        {paymentStep === "success" && (
          <div className="p-8 flex flex-col items-center justify-center space-y-6 text-center min-h-[360px] relative">
            
            {/* Ambient gold glow */}
            <div className="absolute inset-0 bg-[#00e56b]/5 rounded-2xl pointer-events-none" />

            <div className="w-16 h-16 bg-[#00e56b]/20 border border-[#00e56b] rounded-full flex items-center justify-center relative">
              <Check className="w-8 h-8 text-[#00e56b]" />
              <Sparkles className="w-5 h-5 text-[#f5c518] absolute -top-1 -right-1 animate-bounce" />
            </div>

            <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black tracking-widest text-[#f5c518] font-mono block">
                TRANSACTION COMPLETE 🎉
              </span>
              <h4 className="text-2xl font-black font-bebas text-white tracking-wider uppercase">
                PAYMENT SUCCESSFUL!
              </h4>
              <p className="text-xs text-[#5a8a6a] max-w-[280px] mx-auto leading-relaxed">
                Welcome to <strong className="text-[#00e56b]">{activePlan.name}</strong>. Your premium profile tools and ranking accesses are unlocked instantly!
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-[#00e56b] hover:bg-[#00c75c] text-[#050e08] rounded-xl font-bold text-xs uppercase tracking-wider text-center cursor-pointer shadow-lg relative z-10"
            >
              Start using Pro Features ⚡
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
