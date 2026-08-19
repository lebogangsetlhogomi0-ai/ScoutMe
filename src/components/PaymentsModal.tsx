import React, { useState } from "react";
import { md5 } from "js-md5";
import { useApp } from "../context/AppContext";
import { X, Check, Shield, Sparkles } from "lucide-react";

export const PRICING = {
  PLAYER_PRO: {
    id: "player_pro",
    name: "Player Pro",
    price: "R49",
    amount: "49.00",
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
    amount: "299.00",
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

const PAYFAST_URL = import.meta.env.VITE_PAYFAST_SANDBOX === "false"
  ? "https://www.payfast.co.za/eng/process"
  : "https://sandbox.payfast.co.za/eng/process";

function buildPayFastSignature(params: Record<string, string>, passphrase: string): string {
  // Sort params alphabetically, build query string
  const sorted = Object.keys(params)
    .sort()
    .filter(k => params[k] !== "")
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`)
    .join("&");
  const withPassphrase = passphrase ? `${sorted}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}` : sorted;
  return md5(withPassphrase) as string;
}

function redirectToPayFast(params: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST_URL;
  Object.entries(params).forEach(([k, v]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: "player_pro" | "scout_pro";
}

export const PaymentsModal: React.FC<PaymentsModalProps> = ({ isOpen, onClose, defaultTier }) => {
  const { currentUser } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<"player_pro" | "scout_pro">(
    defaultTier || (currentUser?.role === "scout" || currentUser?.role === "club" ? "scout_pro" : "player_pro")
  );
  const [redirecting, setRedirecting] = useState(false);

  if (!isOpen) return null;

  const activePlan = selectedPlan === "player_pro" ? PRICING.PLAYER_PRO : PRICING.SCOUT_PRO;

  const handlePayFast = () => {
    const merchantId = import.meta.env.VITE_PAYFAST_MERCHANT_ID || "";
    const merchantKey = import.meta.env.VITE_PAYFAST_MERCHANT_KEY || "";
    const passphrase = import.meta.env.VITE_PAYFAST_PASSPHRASE || "";

    if (!merchantId || !merchantKey) {
      alert("PayFast is not configured. Please contact support.");
      return;
    }

    const nameParts = (currentUser?.name || "ScoutMe User").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const paymentId = `scoutme_${currentUser?.userId || "guest"}_${Date.now()}`;

    // Store plan in sessionStorage so success page can activate it
    sessionStorage.setItem("payfast_pending_plan", selectedPlan);
    sessionStorage.setItem("payfast_payment_id", paymentId);

    const params: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: "https://scoutme-mu.vercel.app/payment-success",
      cancel_url: "https://scoutme-mu.vercel.app/payment-cancel",
      notify_url: "https://scoutme-mu.vercel.app/api/send-email",
      name_first: firstName,
      name_last: lastName,
      email_address: currentUser?.email || "",
      m_payment_id: paymentId,
      amount: activePlan.amount,
      item_name: `ScoutMe ${activePlan.name}`,
      subscription_type: "1",
      billing_date: new Date().toISOString().split("T")[0],
      recurring_amount: activePlan.amount,
      frequency: "3",
      cycles: "0",
    };

    // Generate signature
    const signature = buildPayFastSignature(params, passphrase);
    params.signature = signature;

    setRedirecting(true);
    redirectToPayFast(params);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050e08]/90 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0a1a0f] border border-[#1a3825] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">

        {/* Close Button */}
        {!redirecting && (
          <button onClick={onClose} className="absolute top-4 right-4 text-[#5a8a6a] hover:text-white p-1 rounded-full hover:bg-[#1a3825] transition">
            <X className="w-5 h-5" />
          </button>
        )}

        {redirecting ? (
          /* Redirecting state */
          <div className="p-8 flex flex-col items-center justify-center space-y-6 text-center min-h-[360px]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-[#1a3825] border-t-[#00e56b] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">🇿🇦</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black font-bebas text-white tracking-wider uppercase animate-pulse">
                Redirecting to PayFast...
              </h4>
              <p className="text-xs text-[#5a8a6a] max-w-[280px] mx-auto leading-relaxed">
                You are being taken to PayFast's secure payment page to complete your {activePlan.name} subscription.
              </p>
            </div>
            <p className="text-[10px] text-[#5a8a6a]/60 font-mono">Do not close this page</p>
          </div>
        ) : (
          /* Plan selection + pay */
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest text-[#00e56b] font-mono">UPGRADE PLATFORM ACCESS</span>
              <h3 className="text-2xl font-black font-bebas text-white tracking-wide">UNLOCK SCOUTME PRO</h3>
              <p className="text-xs text-[#5a8a6a]">Choose the subscription tier engineered for your pathway</p>
            </div>

            {/* Plan cards */}
            <div className="space-y-3.5">
              <div
                onClick={() => setSelectedPlan("player_pro")}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex justify-between items-start ${
                  selectedPlan === "player_pro" ? "bg-[#0f2318] border-[#00e56b] shadow-lg shadow-[#00e56b]/10" : "bg-[#050e08] border-[#1a3825]"
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

              <div
                onClick={() => setSelectedPlan("scout_pro")}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex justify-between items-start ${
                  selectedPlan === "scout_pro" ? "bg-[#231e0f] border-[#f5c518] shadow-lg shadow-[#f5c518]/10" : "bg-[#050e08] border-[#1a3825]"
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

            {/* Features */}
            <div className="bg-[#050e08]/90 border border-[#1a3825]/60 rounded-xl p-4 space-y-3">
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

            {/* PayFast CTA */}
            <button
              onClick={handlePayFast}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 text-[#050e08] shadow-lg ${
                selectedPlan === "player_pro" ? "bg-[#00e56b] hover:bg-[#00c75c]" : "bg-[#f5c518] hover:bg-[#ddb010]"
              }`}
            >
              Pay {activePlan.price}/mo with PayFast →
            </button>

            <div className="flex items-center justify-center space-x-2 text-[10px] text-[#5a8a6a]">
              <Shield className="w-3.5 h-3.5" />
              <span>Secured by PayFast · South Africa's #1 payment gateway</span>
            </div>

            <div className="flex items-center justify-center space-x-4 text-[9px] text-[#5a8a6a]/60 font-mono">
              <span>Visa</span><span>·</span><span>Mastercard</span><span>·</span><span>Capitec Pay</span><span>·</span><span>EFT</span><span>·</span><span>SnapScan</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
