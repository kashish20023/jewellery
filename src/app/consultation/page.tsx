"use client";

import React, { useState } from "react";
import { Phone, Calendar, MessageCircle, CheckCircle2, AlertCircle, Clock, MapPin } from "lucide-react";

export default function ConsultationPage() {
  const [activeTab, setActiveTab] = useState<"callback" | "appointment">("callback");

  // Callback form state
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");
  const [cbEmail, setCbEmail] = useState("");
  const [cbTime, setCbTime] = useState("Morning (10:00 AM - 01:00 PM)");
  const [cbMessage, setCbMessage] = useState("");
  const [cbStatus, setCbStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [cbErrorMessage, setCbErrorMessage] = useState("");

  // Appointment form state
  const [aptName, setAptName] = useState("");
  const [aptPhone, setAptPhone] = useState("");
  const [aptEmail, setAptEmail] = useState("");
  const [aptDate, setAptDate] = useState("");
  const [aptSlot, setAptSlot] = useState("11:00 AM - 01:00 PM");
  const [aptLocation, setAptLocation] = useState<"IN_STORE" | "VIRTUAL">("VIRTUAL");
  const [aptStatus, setAptStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [aptErrorMessage, setAptErrorMessage] = useState("");

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCbStatus("submitting");
    setCbErrorMessage("");

    try {
      const res = await fetch("/api/enquiries/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: cbName,
          customerPhone: cbPhone,
          customerEmail: cbEmail || undefined,
          preferredTime: cbTime,
          message: cbMessage || undefined,
          consentToContact: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCbStatus("success");
      } else {
        setCbStatus("error");
        setCbErrorMessage(data.error || "Unable to submit callback request.");
      }
    } catch {
      setCbStatus("error");
      setCbErrorMessage("Network connection error. Please verify your internet connection or use WhatsApp.");
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAptStatus("submitting");
    setAptErrorMessage("");

    try {
      const res = await fetch("/api/enquiries/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: aptName,
          customerPhone: aptPhone,
          customerEmail: aptEmail,
          requestedDate: aptDate,
          requestedTimeSlot: aptSlot,
          locationPreference: aptLocation,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAptStatus("success");
      } else {
        setAptStatus("error");
        setAptErrorMessage(data.error || "Unable to submit appointment request.");
      }
    } catch {
      setAptStatus("error");
      setAptErrorMessage("Network error. Please connect directly via WhatsApp concierge.");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Editorial Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs uppercase tracking-widest text-olive-700 block mb-2">
          Private Concierge & Consultation
        </span>
        <h1 className="text-3xl sm:text-5xl text-charcoal-950 font-semibold tracking-tight">
          Personal Jewellery Consultation
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-charcoal-700  leading-relaxed">
          Whether you are designing a bespoke bridal suite, selecting an unheated Ceylon sapphire, or seeking guidance on polki craftsmanship, our master stylists are at your disposal.
        </p>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-charcoal-100 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab("callback")}
          className={`flex-1 py-4 text-xs uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "callback"
              ? "border-olive-600 text-charcoal-950 font-bold bg-ivory-tile"
              : "border-transparent text-charcoal-700 hover:text-charcoal-900"
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Request a Callback</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("appointment")}
          className={`flex-1 py-4 text-xs uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "appointment"
              ? "border-olive-600 text-charcoal-950 font-bold bg-ivory-tile"
              : "border-transparent text-charcoal-700 hover:text-charcoal-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Book an Appointment</span>
        </button>
      </div>

      {/* TAB 1: CALLBACK FORM */}
      {activeTab === "callback" && (
        <div className="bg-ivory-tile border border-charcoal-100 p-6 sm:p-10 shadow-subtle">
          {cbStatus === "success" ? (
            <div className="text-center py-10 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-olive-700 mx-auto" />
              <h3 className="text-2xl text-charcoal-950">Callback Request Received</h3>
              <p className="text-xs sm:text-sm text-charcoal-700 max-w-md mx-auto">
                Thank you. An atelier concierge stylist will reach out to you at the requested contact number during business hours (10:00 AM – 7:00 PM IST).
              </p>
              <button
                type="button"
                onClick={() => setCbStatus("idle")}
                className="btn-outline-gold text-xs mt-4"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleCallbackSubmit} className="space-y-6">
              {cbStatus === "error" && (
                <div className="bg-red-50 border border-red-200 p-4 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cbErrorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={cbName}
                    onChange={(e) => setCbName(e.target.value)}
                    placeholder="e.g. Maharani Gayatri Devi"
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    10-Digit Phone Number (India) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={cbPhone}
                    onChange={(e) => setCbPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={cbEmail}
                    onChange={(e) => setCbEmail(e.target.value)}
                    placeholder="concierge@example.com"
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Preferred Time Window
                  </label>
                  <select
                    value={cbTime}
                    onChange={(e) => setCbTime(e.target.value)}
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  >
                    <option value="Morning (10:00 AM - 01:00 PM)">Morning (10:00 AM – 01:00 PM)</option>
                    <option value="Afternoon (01:00 PM - 04:00 PM)">Afternoon (01:00 PM – 04:00 PM)</option>
                    <option value="Evening (04:00 PM - 07:00 PM)">Evening (04:00 PM – 07:00 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                  Piece or Craft Inquiry Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cbMessage}
                  onChange={(e) => setCbMessage(e.target.value)}
                  placeholder="Tell us about the pieces you are interested in or bespoke customisation requirements..."
                  className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                />
              </div>

              <button
                type="submit"
                disabled={cbStatus === "submitting"}
                className="w-full btn-charcoal py-4 text-xs font-semibold uppercase tracking-wider"
              >
                {cbStatus === "submitting" ? "Registering Callback..." : "Submit Callback Request"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENT FORM (S12 Contract) */}
      {activeTab === "appointment" && (
        <div className="bg-ivory-tile border border-charcoal-100 p-6 sm:p-10 shadow-subtle">
          {aptStatus === "success" ? (
            <div className="text-center py-10 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-olive-700 mx-auto" />
              <h3 className="text-2xl text-charcoal-950">
                Appointment Request Submitted
              </h3>
              <div className="bg-olive-50 border border-olive-200 p-4 text-xs text-olive-900 max-w-md mx-auto text-left space-y-2">
                <span className="font-bold block uppercase text-[10px]">
                  Important Notice on Confirmation (S12):
                </span>
                <p>
                  Your private consultation request has been received. Our concierge team will review atelier slot availability and contact you via phone or WhatsApp to formally confirm your scheduled appointment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAptStatus("idle")}
                className="btn-outline-gold text-xs mt-4"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleAppointmentSubmit} className="space-y-6">
              {aptStatus === "error" && (
                <div className="bg-red-50 border border-red-200 p-4 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{aptErrorMessage}</span>
                </div>
              )}

              {/* Consultation Format */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-charcoal-700 block">
                  Consultation Format *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAptLocation("VIRTUAL")}
                    className={`p-4 border text-left flex items-start gap-3 transition-colors ${
                      aptLocation === "VIRTUAL"
                        ? "border-olive-600 bg-olive-50 ring-1 ring-olive-500"
                        : "border-charcoal-100 bg-white"
                    }`}
                  >
                    <Clock className="w-5 h-5 text-olive-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-charcoal-950 block">
                        Virtual Video Suite
                      </span>
                      <span className="text-[11px] text-charcoal-700 ">
                        High-definition 1-on-1 jewellery showcase from your home.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAptLocation("IN_STORE")}
                    className={`p-4 border text-left flex items-start gap-3 transition-colors ${
                      aptLocation === "IN_STORE"
                        ? "border-olive-600 bg-olive-50 ring-1 ring-olive-500"
                        : "border-charcoal-100 bg-white"
                    }`}
                  >
                    <MapPin className="w-5 h-5 text-olive-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-charcoal-950 block">
                        Atelier Salon Visit
                      </span>
                      <span className="text-[11px] text-charcoal-700 ">
                        Private viewing at our Jaipur or Mumbai flagship salon.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={aptName}
                    onChange={(e) => setAptName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Phone Number (India) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={aptPhone}
                    onChange={(e) => setAptPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={aptEmail}
                    onChange={(e) => setAptEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Requested Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-charcoal-700 block mb-1.5">
                    Requested Time Slot *
                  </label>
                  <select
                    value={aptSlot}
                    onChange={(e) => setAptSlot(e.target.value)}
                    className="w-full bg-white border border-charcoal-100 p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-olive-500"
                  >
                    <option value="11:00 AM - 01:00 PM">11:00 AM – 01:00 PM</option>
                    <option value="02:00 PM - 04:00 PM">02:00 PM – 04:00 PM</option>
                    <option value="04:30 PM - 06:30 PM">04:30 PM – 06:30 PM</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-charcoal-700 bg-ivory-200/50 p-3 border border-charcoal-100">
                Notice: All appointments are subject to staff availability and private salon scheduling. Our concierge will contact you to confirm the appointment.
              </div>

              <button
                type="submit"
                disabled={aptStatus === "submitting"}
                className="w-full btn-charcoal py-4 text-xs font-semibold uppercase tracking-wider"
              >
                {aptStatus === "submitting" ? "Requesting Appointment..." : "Request Private Consultation"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Direct WhatsApp Concierge Alternative */}
      <div className="mt-12 bg-charcoal-950 text-ivory-50 p-8 border border-charcoal-800 text-center">
        <h3 className="text-xl text-ivory-50 font-semibold">
          Prefer Immediate Styling Assistance?
        </h3>
        <p className="text-xs text-ivory-200/80  mt-1 max-w-md mx-auto">
          Connect directly with our master gemologist on WhatsApp for real-time video previews, hallmarking questions, and immediate quotes.
        </p>
        <a
          href="https://wa.me/919876543210?text=Hello%20Chudiwalas%2C%20I%20would%20like%20to%20speak%20with%20a%20concierge%20stylist"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold text-xs inline-flex items-center gap-2 mt-6 py-3 px-6"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat with Concierge (+91 98765 43210)</span>
        </a>
      </div>
    </main>
  );
}

