import React, { useState, useRef, useEffect } from "react";
import { formatSATime } from "../utils/saTime";
import { useApp } from "../context/AppContext";
import { X, Check, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DigitalAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedSuccess?: () => void;
}

export const DigitalAgreementModal: React.FC<DigitalAgreementModalProps> = ({ isOpen, onClose, onSignedSuccess }) => {
  const { signDigitalAgreement, currentUser } = useApp();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [checkboxTicked, setCheckboxTicked] = useState(false);
  const [guardianConsentChecked, setGuardianConsentChecked] = useState(false);
  const [signedStamp, setSignedStamp] = useState<string | null>(null);
  
  const textRef = useRef<HTMLDivElement>(null);

  // Monitor scrolling to enforce complete reading
  const handleScroll = () => {
    if (textRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = textRef.current;
      const totalScrollable = scrollHeight - clientHeight;
      if (totalScrollable > 0) {
        const progress = Math.min(Math.round((scrollTop / totalScrollable) * 100), 100);
        setScrollProgress(progress);
        if (progress >= 85) {
          setScrolledToBottom(true);
        }
      } else {
        setScrollProgress(100);
        setScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    if (currentUser?.agreementSigned) {
      setCheckboxTicked(true);
      setGuardianConsentChecked(true);
      setScrolledToBottom(true);
      setScrollProgress(100);
      setSignedStamp(currentUser.agreementSignedAt || new Date().toISOString());
    }
  }, [currentUser, isOpen]);

  // Adjust scroll when opened in case text is short enough to fit without scrolling
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (textRef.current) {
          const { scrollHeight, clientHeight } = textRef.current;
          if (scrollHeight <= clientHeight + 10) {
            setScrollProgress(100);
            setScrolledToBottom(true);
          }
        }
      }, 300);
    }
  }, [isOpen]);

  const handleSign = () => {
    if (scrolledToBottom && checkboxTicked && guardianConsentChecked) {
      signDigitalAgreement();
      const timestamp = new Date().toISOString();
      setSignedStamp(timestamp);
      
      // Zero-latency success sound chime
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
          osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }
      } catch (soundErr) {
        console.log("Agreement chime skipped:", soundErr);
      }

      setTimeout(() => {
        if (onSignedSuccess) {
          onSignedSuccess();
        }
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050e08]/95 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#0a1a0f] border-t-4 border-[#00e56b] border border-[#1a3825] rounded-2xl w-full max-w-[600px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] select-none relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#1a3825] bg-[#050e08] flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#00e56b]" />
                <h2 className="text-2xl font-black font-bebas tracking-wide text-white uppercase">
                  SCOUTME PLATFORM AGREEMENT
                </h2>
              </div>
              <p className="text-xs text-[#5a8a6a] font-mono">
                ScoutMe · South Africa
              </p>
            </div>
            <div className="flex flex-col items-end space-y-1.5">
              <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded font-mono uppercase tracking-wider shadow-sm select-none">
                ⚖ LEGALLY BINDING DOCUMENT
              </span>
            </div>
          </div>

          {/* Scrollable Document Body */}
          <div 
            ref={textRef}
            onScroll={handleScroll}
            className="p-6 overflow-y-auto text-sm text-[#e8f5ee]/95 space-y-5 flex-1 max-h-[45vh] leading-relaxed font-sans scroll-smooth"
          >
            <div className="text-center pb-4 border-b border-[#1a3825]/45">
              <p className="font-bold text-white uppercase text-sm font-sans">
                SCOUTME PLATFORM USAGE AND PLACEMENT AGREEMENT
              </p>
              <p className="text-xs text-[#5a8a6a] mt-1 italic">
                ScoutMe | Registration pending | South Africa<br />
                Effective date: Upon account registration
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                PARTIES
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                This agreement is entered into between:<br />
                • <strong>ScoutMe</strong> (hereinafter "the Platform"), and<br />
                • <strong>You</strong>, the registering user (hereinafter "the User")
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                1. PLATFORM PURPOSE
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                ScoutMe is a football talent discovery and scouting platform that connects grassroots players with professional scouts, agents, and clubs. The Platform uses AI-powered tools to surface, analyse, and present player talent to verified scouting professionals.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                2. DISCOVERY DECLARATION OBLIGATION
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                By registering on this Platform, the User agrees and acknowledges:<br /><br />
                2.1 Any scout, agent, or club that discovers a player through ScoutMe — defined as viewing a player's profile, video content, or AI scouting report — and subsequently enters into any formal or informal negotiation, trial arrangement, or contractual agreement with that player within <strong>24 months</strong> of first platform contact, is obligated to declare that discovery to ScoutMe.<br /><br />
                2.2 "Discovery" is defined as: any interaction with a player's profile, video, or data on the Platform, including profile views, shortlist additions, report generation, contact requests, or direct messages sent through the Platform.<br /><br />
                2.3 All interactions on the Platform are <strong>timestamped and permanently logged</strong>. ScoutMe maintains an auditable record of every scout-player interaction. These records constitute evidence of discovery origin.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                3. PLACEMENT FEE
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                3.1 When a player discovered through ScoutMe is officially signed, contracted, or placed with any club, academy, or sporting organisation within the 24-month discovery window, a <strong>placement fee is owed to ScoutMe</strong>.<br /><br />
                3.2 The placement fee structure is:<br />
                • Amateur/grassroots signings: negotiated based on contract value<br />
                • Semi-professional signings (NFD and equivalent): 3% of first-year contract value<br />
                • Professional signings (PSL, CAF, international): 5% of first-year contract value<br /><br />
                3.3 The placement fee is payable within <strong>30 days</strong> of the player's official signing date.<br /><br />
                3.4 Failure to declare a signing or pay the placement fee within the specified timeframe will result in: formal legal notice, escalation to SAFA's Intermediary Registration Team, and civil litigation to recover the fee plus damages.
              </p>
            </div>

            {/* PLACEMENT FEE AND LEGAL ENFORCEMENT — Highlighted Block */}
            <div className="space-y-3 pt-2 border-t-2 border-amber-500/50 mt-2">
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-4">
                <p className="font-black text-amber-400 uppercase text-[13px] tracking-wider font-mono text-center">
                  ⚖ PLACEMENT FEE AND LEGAL ENFORCEMENT
                </p>

                <div className="space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">1. DISCOVERY DECLARATION</p>
                  <p className="text-xs text-[#e8f5ee]/80 leading-relaxed">
                    If a player is discovered through ScoutMe — defined as any scout, club, or agent viewing a player's profile, video content, or AI scouting report on this platform — and that player is subsequently signed, contracted, or placed with any club or organisation within <strong>24 months</strong> of first platform contact, that signing MUST be declared to ScoutMe within <strong>30 days</strong> of the official signing date.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">2. PLACEMENT FEE OBLIGATION</p>
                  <p className="text-xs text-[#e8f5ee]/80 leading-relaxed">
                    A placement fee is owed to ScoutMe upon any signing that originates from player discovery on this platform within the 24-month window.<br /><br />
                    <strong>Fee structure:</strong><br />
                    • Amateur and grassroots signings: negotiated based on contract value<br />
                    • Semi-professional signings (NFD and equivalent): <strong>3% of first-year contract value</strong><br />
                    • Professional signings (PSL, CAF, international): <strong>5% of first-year contract value</strong><br /><br />
                    The placement fee is payable within <strong>30 days</strong> of the official signing date.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-amber-400 uppercase text-[11px] tracking-wider font-mono">3. LEGAL ACTION FOR NON-PAYMENT</p>
                  <p className="text-xs text-[#e8f5ee]/80 leading-relaxed">
                    If a club, agent, or organisation discovers a player through ScoutMe and signs that player within the 24-month window WITHOUT declaring the signing or paying the placement fee, ScoutMe reserves the right to:<br /><br />
                    • Issue a formal legal notice demanding payment plus damages<br />
                    • Escalate to SAFA's Intermediary Registration Team<br />
                    • Pursue civil litigation in South African courts to recover the full placement fee plus legal costs and interest<br />
                    • Permanently ban the offending club, agent, or organisation from the platform<br />
                    • Publicly disclose the breach to relevant football governing bodies
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">4. PLATFORM EVIDENCE</p>
                  <p className="text-xs text-[#e8f5ee]/80 leading-relaxed">
                    All scout and club interactions on ScoutMe are <strong>timestamped and permanently logged</strong>. These records constitute legal evidence of discovery origin and will be used in any dispute or legal proceeding.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">5. GOVERNING LAW</p>
                  <p className="text-xs text-[#e8f5ee]/80 leading-relaxed">
                    This agreement is governed by the laws of the Republic of South Africa. Any disputes will be subject to the jurisdiction of the South African courts. This electronic agreement is legally enforceable under the <strong>Electronic Communications and Transactions Act (ECTA)</strong> of South Africa.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                4. SCOUT AND CLUB OBLIGATIONS
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                4.1 Scouts and clubs agree not to circumvent the Platform by contacting players discovered through ScoutMe through unofficial channels for the purpose of avoiding the placement fee.<br /><br />
                4.2 The <strong>Contact Gateway</strong> — ScoutMe's official communication channel between scouts/clubs and players — is the designated route for all initial contact. Using the Contact Gateway constitutes formal acknowledgment of Platform-originated discovery.<br /><br />
                4.3 Scout and club accounts found to have bypassed the Contact Gateway or concealed a Platform-originated signing will have their accounts permanently terminated and will face legal action.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                5. PLAYER RIGHTS AND PROTECTIONS
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                5.1 Players on ScoutMe retain full ownership of their personal data, video content, and performance information.<br /><br />
                5.2 Players may withdraw their profile from public discovery at any time through their account settings.<br /><br />
                5.3 ScoutMe will not share, sell, or transfer player personal data to any third party without explicit consent, in compliance with the <strong>Protection of Personal Information Act (POPIA), South Africa</strong>.<br /><br />
                5.4 Players under the age of 18 require verifiable parental or guardian consent before their profile is made discoverable to scouts. A guardian consent declaration must be completed during registration.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                6. POPIA COMPLIANCE
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                ScoutMe processes personal information in accordance with POPIA. Users have the right to access, correct, and request deletion of their personal information. Contact: <strong>privacy@scoutme.co.za</strong>
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                7. DISPUTE RESOLUTION
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                Any disputes arising from this agreement shall be governed by the laws of the Republic of South Africa and subject to the jurisdiction of the South African courts.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1a3825]/30 pb-4">
              <p className="font-bold text-[#00e56b] uppercase text-[12px] tracking-wider font-mono">
                8. ACKNOWLEDGEMENT
              </p>
              <p className="text-xs text-[#e8f5ee]/80">
                By ticking the checkboxes and tapping "I AGREE AND SIGN", the User confirms they have read, understood, and agree to be legally bound by this agreement. This electronic signature is valid and enforceable under the <strong>Electronic Communications and Transactions Act (ECTA), South Africa</strong>.
              </p>
              <p className="text-[10px] text-[#5a8a6a] mt-2 leading-relaxed">
                *This agreement was last updated: June 2026<br />
                *ScoutMe · South Africa<br />
                *For legal inquiries: legal@scoutme.co.za
              </p>
            </div>
          </div>

          {/* Scroll Progress Enforcer Indicator */}
          <div className="bg-[#050e08] border-t border-[#1a3825] py-2 px-6 flex justify-between items-center text-xs text-[#5a8a6a]">
            <span>Read Scroll Requirement:</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-[#102416] h-1.5 rounded-full overflow-hidden border border-[#1a3825]">
                <div 
                  className="bg-[#00e56b] h-full transition-all duration-300" 
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>
              <span className={`font-mono font-bold ${scrollProgress >= 100 ? "text-[#00e56b]" : "text-white"}`}>
                {scrollProgress}%
              </span>
            </div>
          </div>

          {/* Bottom Section with Checkboxes & Sign Action */}
          <div className="p-5 border-t border-[#1a3825] bg-[#050e08] space-y-4">
            {signedStamp ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0f2318] border border-[#00e56b] p-4 rounded-xl text-center space-y-3"
              >
                <div className="flex items-center justify-center space-x-2 text-[#00e56b]">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ repeat: 1, duration: 0.5 }}
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </motion.div>
                  <span className="font-black uppercase tracking-wider text-xs font-mono">Agreement Signed & Formally Recorded</span>
                </div>
                
                {/* Signature flourish cursive illustration */}
                <div className="py-2 flex justify-center items-center font-cursive text-xl text-emerald-400 italic font-medium tracking-widest border-b border-dashed border-[#1a3825] max-w-[240px] mx-auto select-none select-all select-none">
                  {currentUser?.name || "Verified ScoutMe User"}
                </div>

                <div className="text-[10px] text-[#5a8a6a] space-y-1">
                  <p>Timestamp: <span className="text-white font-mono">{formatSATime(signedStamp)}</span></p>
                  <p className="leading-relaxed">Your signing has been logged and is legally enforceable under ECTA, South Africa.</p>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Scroll Enforcement Warning */}
                {!scrolledToBottom && (
                  <div className="flex flex-col space-y-2 select-none">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[11px] text-amber-500 text-center font-medium tracking-tight animate-pulse uppercase">
                      🛑 You must scroll and read to the bottom of the agreement to unlock signing.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (textRef.current) {
                          textRef.current.scrollTop = textRef.current.scrollHeight;
                          setScrollProgress(100);
                          setScrolledToBottom(true);
                        }
                      }}
                      className="py-1.5 px-3 bg-[#1c3e21] hover:bg-[#00e56b]/15 border border-[#00e56b]/30 text-[#00e56b] rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer self-center"
                    >
                      ⚡ Fast Scroll to Bottom & Accept
                    </button>
                  </div>
                )}

                {/* Checkbox 1 */}
                <div className="flex items-start space-x-3 text-xs text-[#e8f5ee]">
                  <input
                    id="checkbox_modal_verify"
                    type="checkbox"
                    disabled={!scrolledToBottom}
                    checked={checkboxTicked}
                    onChange={(e) => setCheckboxTicked(e.target.checked)}
                    className="w-4 h-4 rounded mt-0.5 accent-[#00e56b] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor="checkbox_modal_verify"
                    className={`cursor-pointer leading-snug ${!scrolledToBottom ? "text-[#5a8a6a] opacity-50" : "text-white"}`}
                  >
                    I agree to the ScoutMe Digital Agreement and understand its legally binding terms.
                  </label>
                </div>

                {/* Checkbox 2 (U18 / parental consent check) */}
                <div className="flex items-start space-x-3 text-xs text-[#e8f5ee]">
                  <input
                    id="checkbox_modal_consent"
                    type="checkbox"
                    disabled={!scrolledToBottom}
                    checked={guardianConsentChecked}
                    onChange={(e) => setGuardianConsentChecked(e.target.checked)}
                    className="w-4 h-4 rounded mt-0.5 accent-[#00e56b] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <label 
                    htmlFor="checkbox_modal_consent" 
                    className={`cursor-pointer leading-snug ${!scrolledToBottom ? "text-[#5a8a6a] opacity-50" : "text-white"}`}
                  >
                    I confirm I am 18 years or older, OR I have obtained verifiable parental/guardian consent to register and list data on this platform.
                  </label>
                </div>

                {/* Sign Buttons */}
                <div className="flex space-x-3 pt-2">
                  <button
                    id="sign_agreement_modal_submit"
                    disabled={!scrolledToBottom || !checkboxTicked || !guardianConsentChecked}
                    onClick={handleSign}
                    className="w-full py-4 bg-[#00e56b] text-[#050e08] rounded-xl font-extrabold uppercase tracking-widest text-sm transition duration-200 disabled:bg-[#1a3020] disabled:text-[#5a8a6a] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.99]"
                  >
                    I AGREE AND SIGN ✦
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
