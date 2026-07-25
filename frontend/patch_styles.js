const fs = require('fs');
const file = '/Users/sachin/Desktop/angularevera/src/app/views/energy/energy.ts';
let content = fs.readFileSync(file, 'utf8');

const newStyles = `  styles: [\`
    .battery-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #f3e8ff 100%);
      color: #334155;
      padding: 120px 24px 80px 24px;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Soft Gradient blobs */
    .glow-bg {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.3;
      z-index: 0;
      pointer-events: none;
      animation: floatBlobs 20s infinite alternate ease-in-out;
    }
    .glow-cyan { top: 10%; left: -10%; background: #00D2FF; }
    .glow-pink { top: 35%; right: -10%; background: #FF007F; animation-delay: -5s; }
    .glow-orange { bottom: 10%; left: 10%; background: #FF7F00; animation-delay: -10s; }
    .glow-purple { bottom: 25%; right: 15%; background: #7952FF; animation-delay: -15s; }

    @keyframes floatBlobs {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(60px, -40px) scale(1.1); }
      100% { transform: translate(-40px, 50px) scale(0.9); }
    }

    .text-gradient-evcorn {
      background: linear-gradient(to right, #00D2FF 0%, #7952FF 35%, #FF007F 70%, #FF7F00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-block;
      font-weight: 900;
    }

    .battery-hero {
      position: relative;
      z-index: 1;
      max-width: 800px;
      margin: 0 auto 50px auto;
      text-align: center;
    }
    .battery-badge {
      display: inline-block;
      padding: 6px 18px;
      background: #F3E8FF;
      border: 1px solid #D8B4FE;
      border-radius: 30px;
      color: #7E22CE;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
      box-shadow: 0 4px 15px rgba(126, 34, 206, 0.1);
    }
    .battery-hero h1 {
      font-size: 3.5rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin-bottom: 16px;
      line-height: 1.1;
    }
    .battery-hero p {
      font-size: 1.15rem;
      line-height: 1.6;
      color: #64748B;
    }

    .calculator-grid {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 30px;
    }
    .calc-panel {
      background: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(255, 255, 255, 1);
      border-radius: 24px;
      padding: 40px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04), 0 2px 10px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      margin-bottom: 35px;
    }
    .panel-header h2 {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 8px;
    }
    .panel-header p {
      font-size: 0.95rem;
      color: #64748B;
    }

    .input-group {
      margin-bottom: 35px;
      background: rgba(255, 255, 255, 0.9);
      padding: 24px;
      border-radius: 16px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.01);
    }
    .input-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .input-header label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #334155;
    }
    .unit-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748B;
      background: #F1F5F9;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .stepper-control {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .step-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      color: #475569;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .step-btn:hover {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }
    .step-btn:active {
      transform: scale(0.95);
    }
    .num-input {
      flex-grow: 1;
      height: 44px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      color: #0F172A;
      font-size: 1.4rem;
      font-weight: 800;
      text-align: center;
      -moz-appearance: textfield;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);
    }
    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .num-input:focus {
      outline: none;
      border-color: #38BDF8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }

    .premium-slider {
      width: 100%;
      -webkit-appearance: none;
      height: 6px;
      border-radius: 3px;
      background: #E2E8F0;
      outline: none;
    }
    .premium-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #38BDF8;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(56, 189, 248, 0.4);
      transition: transform 0.1s;
    }
    .premium-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .tech-defaults {
      margin-top: 10px;
    }
    .tech-defaults details {
      cursor: pointer;
    }
    .tech-defaults summary {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748B;
      user-select: none;
      padding-bottom: 10px;
    }
    .defaults-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 10px;
      background: #F8FAFC;
      padding: 16px;
      border-radius: 12px;
      cursor: default;
      border: 1px solid #E2E8F0;
    }
    .default-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.8rem;
    }
    .default-item span {
      color: #64748B;
    }
    .default-item strong {
      color: #334155;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 35px;
      flex-grow: 1;
    }
    .metric-card {
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
    }
    .metric-card:hover::before {
      opacity: 1;
    }

    .metric-card.card-premium { border-color: #DDD6FE; background: linear-gradient(to bottom, #FFFFFF, #F5F3FF); }
    .metric-card.card-green { border-color: #A7F3D0; background: linear-gradient(to bottom, #FFFFFF, #ECFDF5); }
    .metric-card.card-gold { border-color: #FDE68A; background: linear-gradient(to bottom, #FFFFFF, #FFFBEB); }
    .metric-card.card-blue { border-color: #BAE6FD; background: linear-gradient(to bottom, #FFFFFF, #F0F9FF); }
    .metric-card.card-emerald { border-color: #99F6E4; background: linear-gradient(to bottom, #FFFFFF, #F0FDFA); }

    .metric-icon {
      font-size: 2rem;
      background: #FFFFFF;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      border: 1px solid #F1F5F9;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .metric-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 1;
    }
    .metric-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-value-wrap {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .metric-value {
      font-size: 2.5rem;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .metric-unit {
      font-size: 1.1rem;
      font-weight: 600;
      color: #64748B;
    }

    /* Detail Grid inside Cards */
    .metric-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #F1F5F9;
    }
    .detail-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-val {
      font-size: 1.1rem;
      font-weight: 800;
      color: #334155;
    }
    .detail-lbl {
      font-size: 0.75rem;
      color: #94A3B8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .detail-box.highlight .detail-val {
      color: #10B981; /* Emerald Green */
    }

    .lead-cta {
      display: flex;
      justify-content: center;
      margin-top: auto;
    }
    .cta-btn {
      width: 100%;
      background: linear-gradient(135deg, #00D2FF 0%, #3A7BD5 100%);
      color: #ffffff;
      border: none;
      padding: 16px 24px;
      border-radius: 14px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 10px 25px rgba(0, 210, 255, 0.25);
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 35px rgba(0, 210, 255, 0.35);
    }
    .cta-btn:active {
      transform: scale(0.98);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .calculator-grid { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    }
    @media (max-width: 768px) {
      .battery-hero h1 { font-size: 2.5rem; }
      .calc-panel { padding: 24px; }
      .metric-value { font-size: 2rem; }
    }
  \`]`;

const startIdx = content.indexOf('  styles: [');
const endIdx = content.indexOf('  \`]\n})') + 4; // Length of closing backtick and array

if (startIdx !== -1 && endIdx !== -1) {
    const patched = content.substring(0, startIdx) + newStyles + content.substring(endIdx);
    fs.writeFileSync(file, patched);
    console.log("Patched successfully!");
} else {
    console.log("Could not find styles boundaries.");
}
