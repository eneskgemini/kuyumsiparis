import React from 'react';

const PrintStyles = () => (
  <style>{`
    .print-page { width: 210mm; min-height: 297mm; padding: 10mm; background: white; position: relative; display: flex; flex-direction: column; box-sizing: border-box; border: 1px solid #e2e8f0; margin-bottom: 40px; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; border: 1px solid #000; }
    .header-table th, .header-table td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; line-height: 1.1; }
    .header-table th { background-color: #eee; font-weight: bold; }
    .erp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; align-content: start; }
    .erp-card { border: 1px solid #000; display: flex; flex-direction: column; font-size: 9px; height: 225px; box-sizing: border-box; page-break-inside: avoid; overflow: hidden; background: #fff; }
    .erp-image-area { flex: 1; border-bottom: 1px solid #000; display: flex; justify-content: center; align-items: center; background: #fff; overflow: hidden; padding: 0; }
    .erp-image-area img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
    .erp-details-area { flex-shrink: 0; height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .erp-header { font-weight: bold; background-color: #eee; text-align: center; font-size: 10px; border-bottom: 1px solid #ccc; padding: 1px 0; white-space: nowrap; overflow: hidden; }
    .erp-compact-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #ccc; padding: 0 4px; font-size: 9px; line-height: 14px; background: #fff; height: 15px; }
    .erp-note { margin-top: auto; background-color: #ffffcc !important; padding: 2px; font-weight: bold; font-size: 8px; border-top: 1px solid #000; text-align: center; height: 35px; display: flex; flex-direction: column; justify-content: center; align-items: center; line-height: 1; }
    .erp-note input, .erp-note select { background: transparent !important; border: none !important; text-align: center; width: 100%; font-weight: bold; font-size: 8px; padding: 0 !important; margin: 0 !important; outline: none; }
    .footer-summary { margin-top: auto; border-top: 2px solid black; padding-top: 5px; font-size: 11px; }
    .screen-view-container { display: flex; flex-direction: column; align-items: center; background: #1B1A17; padding: 40px 20px; min-height: 100vh; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    @media print {
      @page { size: A4; margin: 0; }
      html, body { 
          height: auto !important; 
          min-height: auto !important;
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important; 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
          overflow: visible !important;
      }
      
      .screen-only { display: none !important; }
      .no-print { display: none !important; }
      
      .modal-overlay-fix { 
          position: relative !important; 
          top: 0 !important; 
          left: 0 !important; 
          right: 0 !important;
          bottom: auto !important;
          background: transparent !important; 
          display: block !important; 
          overflow: visible !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
      }
      
      .screen-view-container { 
          margin: 0 !important; 
          padding: 0 !important; 
          display: block !important; 
          background: transparent !important;
          min-height: auto !important;
      }
      
      #printable-root { 
          display: block !important; 
          width: 100% !important; 
          margin: 0 !important;
          padding: 0 !important;
      }
      
      .print-page { 
          display: block !important; 
          border: none !important; 
          box-shadow: none !important; 
          margin: 0 !important; 
          padding: 5mm !important;
          page-break-inside: avoid !important;
          page-break-after: always !important; 
          width: 100% !important; 
          height: auto !important; 
          min-height: 0 !important; 
      }
      .print-page:first-of-type { 
          page-break-before: avoid !important; 
      }
      .print-page:last-of-type { 
          page-break-after: auto !important; 
      }
      
      .erp-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 5px !important; }
      .erp-card { display: flex !important; flex-direction: column !important; page-break-inside: avoid !important; }
      
      input, textarea, select { border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important; resize: none !important; box-shadow: none !important; font-weight: bold !important; color: #000 !important; appearance: none; -webkit-appearance: none; }
      .text-red-600 { color: #dc2626 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-invisible-card { display: none !important; }
    }
  `}</style>
);

export default PrintStyles;