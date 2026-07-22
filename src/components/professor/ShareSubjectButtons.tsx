"use client";

import { useState } from "react";
import QRCode from "qrcode";

export function ShareSubjectButtons({
  subjectId,
  subjectName,
  disabled = false,
}: {
  subjectId: string;
  subjectName: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const getUrl = () => `${window.location.origin}/s/${subjectId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(getUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openQr = async () => {
    setShowQr(true);
    if (!qrDataUrl) {
      setQrDataUrl(await QRCode.toDataURL(getUrl(), { width: 320, margin: 1 }));
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={openQr}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed text-teal-700 bg-teal-50 hover:bg-teal-100"
        >
          QR
        </button>
        <button
          onClick={copyLink}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed text-teal-700 bg-teal-50 hover:bg-teal-100"
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
      </div>

      {showQr && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-gray-900 mb-1">{subjectName}</p>
            <p className="text-xs text-gray-400 mb-4 break-all">{getUrl()}</p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR de ${subjectName}`} className="mx-auto rounded-lg" />
            ) : (
              <p className="text-sm text-gray-400">Generando QR...</p>
            )}
            <button
              onClick={() => setShowQr(false)}
              className="mt-4 w-full py-2 px-4 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
