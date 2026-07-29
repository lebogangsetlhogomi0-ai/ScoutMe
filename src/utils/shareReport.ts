import { POSITION_BENCHMARKS, getOverallRanking } from "./benchmark";

export const generateAndShareReportCard = async (
  player: any,
  report: any,
  setIsGenerating: (loading: boolean) => void
) => {
  setIsGenerating(true);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2D context");

    const positionKey = (player.position || "ST").toUpperCase();
    const benchmark = POSITION_BENCHMARKS[positionKey] || POSITION_BENCHMARKS["ST"];
    const overallRanking = getOverallRanking(
      {
        pace: report.paceScore,
        vision: report.visionScore,
        finishing: report.finishingScore,
      },
      positionKey
    ) || { label: "DEVELOPING", badge: "DEVELOPING ↗", color: "#5a8a6a", percentile: "bottom 50%" };

    // 1. Background Fill
    ctx.fillStyle = "#050e08";
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Radar pulse rings (centered at canvas center: 540, 540)
    ctx.lineWidth = 1.5;
    
    // Circle 1
    ctx.strokeStyle = "rgba(0, 229, 107, 0.06)";
    ctx.beginPath();
    ctx.arc(540, 540, 400, 0, Math.PI * 2);
    ctx.stroke();

    // Circle 2
    ctx.strokeStyle = "rgba(0, 229, 107, 0.04)";
    ctx.beginPath();
    ctx.arc(540, 540, 300, 0, Math.PI * 2);
    ctx.stroke();

    // Circle 3
    ctx.strokeStyle = "rgba(0, 229, 107, 0.03)";
    ctx.beginPath();
    ctx.arc(540, 540, 200, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Top Section
    // Left Branding
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "800 32px 'Bebas Neue', 'Arial Black', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("SCOUT", 60, 110);
    const scoutWidth = ctx.measureText("SCOUT").width;
    ctx.fillStyle = "#00e56b";
    ctx.fillText("ME", 60 + scoutWidth + 4, 110);

    // Right Tag
    ctx.textAlign = "right";
    ctx.font = "900 12px 'Inter', sans-serif";
    ctx.fillStyle = "#f5c518";
    ctx.fillText("NEURAL SCOUT INTELLIGENCE ◆", 1020, 110);

    // Divider Line
    ctx.strokeStyle = "#1a3825";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.lineTo(1020, 160);
    ctx.stroke();

    // 4. Player Identity Section (y: 180-280)
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 52px 'Bebas Neue', 'Arial Black', sans-serif";
    ctx.fillText(player.name.toUpperCase(), 540, 210);

    // Position badge pill (centered below name)
    const posText = `${player.position || "CAM"} · ${benchmark.label.toUpperCase()}`;
    ctx.font = "bold 13px 'Inter', sans-serif";
    const posWidth = ctx.measureText(posText).width;
    const pillWidth = posWidth + 30;
    const pillHeight = 28;
    const pillX = 540 - pillWidth / 2;
    const pillY = 240;

    ctx.fillStyle = "#0a1a0f";
    ctx.strokeStyle = "#00e56b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#00e56b";
    ctx.fillText(posText, 540, pillY + pillHeight / 2);

    // Province + League text
    ctx.fillStyle = "#5a8a6a";
    ctx.font = "500 14px 'Inter', sans-serif";
    ctx.fillText(`${player.province || "Gauteng"} · Grassroots Premier Division`, 540, 290);

    // 5. Score Hero Section (y: 300-480)
    const scoreX = 540;
    const scoreY = 390;
    // Outer Ring
    ctx.strokeStyle = "#f5c518";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(scoreX, scoreY, 90, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Fill
    ctx.fillStyle = "#0a1a0f";
    ctx.beginPath();
    ctx.arc(scoreX, scoreY, 88, 0, Math.PI * 2);
    ctx.fill();

    // Score Number
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 76px 'Bebas Neue', 'Arial Black', sans-serif";
    ctx.fillText(report.overallScore.toString(), scoreX, scoreY - 10);

    // "/ 100"
    ctx.fillStyle = "#5a8a6a";
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillText("/ 100", scoreX, scoreY + 35);

    // "AI SCORE"
    ctx.fillStyle = "#f5c518";
    ctx.font = "900 10px 'Inter', sans-serif";
    ctx.fillText("AI SCORE", scoreX, scoreY + 55);

    // 6. Attribute Bars Section (y: 500-680)
    const metricsY = [515, 570, 625];
    const metrics = [
      { label: "PACE", score: report.paceScore, color: "#00e56b" },
      { label: "VISION", score: report.visionScore, color: "#f5c518" },
      { label: "FINISHING", score: report.finishingScore, color: "#4da6ff" }
    ];

    metrics.forEach((metric, idx) => {
      const y = metricsY[idx];
      
      // Label
      ctx.textAlign = "left";
      ctx.fillStyle = "#5a8a6a";
      ctx.font = "bold 12px 'Inter', sans-serif";
      ctx.fillText(metric.label, 80, y);

      // Score Value
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px 'Inter', sans-serif";
      ctx.fillText(`${metric.score}/100`, 1000, y);

      // Track
      const trackWidth = 920;
      const trackX = 80;
      const trackY = y + 10;
      const trackHeight = 8;
      
      ctx.fillStyle = "#1a3825";
      ctx.beginPath();
      ctx.roundRect(trackX, trackY, trackWidth, trackHeight, 4);
      ctx.fill();

      // Fill
      const fillWidth = (metric.score / 100) * trackWidth;
      ctx.fillStyle = metric.color;
      ctx.beginPath();
      ctx.roundRect(trackX, trackY, fillWidth, trackHeight, 4);
      ctx.fill();
    });

    // 7. Ranking Section (y: 700-780)
    // Ranking badge pill (centered, height 32, width 220)
    const rankPillText = `${overallRanking.badge} ${player.position || "CAM"}`;
    ctx.font = "bold 12px 'Inter', sans-serif";
    const rWidth = ctx.measureText(rankPillText).width + 30;
    const rHeight = 28;
    const rX = 540 - rWidth / 2;
    const rY = 680;

    ctx.fillStyle = overallRanking.color;
    ctx.beginPath();
    ctx.roundRect(rX, rY, rWidth, rHeight, 6);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#050e08";
    ctx.font = "900 12px 'Inter', sans-serif";
    ctx.fillText(rankPillText, 540, rY + rHeight / 2);

    ctx.fillStyle = "#5a8a6a";
    ctx.font = "500 11px 'Inter', sans-serif";
    ctx.fillText("Ranked against all ScoutMe players in this position", 540, rY + rHeight + 15);

    // 8. AI Assessment Section (y: 800-920)
    ctx.strokeStyle = "#1a3825";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 780);
    ctx.lineTo(1020, 780);
    ctx.stroke();

    // Quote mark
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0, 229, 107, 0.2)";
    ctx.font = "800 48px 'Bebas Neue', sans-serif";
    ctx.fillText("“", 80, 810);

    // Wrap report text and draw
    ctx.fillStyle = "#e8f5ee";
    ctx.font = "italic 500 13px 'Inter', sans-serif";
    wrapText(ctx, report.generatedReport, 100, 815, 880, 20, 3);

    // Attribution
    ctx.textAlign = "right";
    ctx.fillStyle = "#f5c518";
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.fillText("— Neural Scout Intelligence ◆", 1000, 895);

    // 9. Footer Section (y: 940-1080)
    ctx.strokeStyle = "#1a3825";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 930);
    ctx.lineTo(1020, 930);
    ctx.stroke();

    // Left Footer
    ctx.textAlign = "left";
    ctx.fillStyle = "#5a8a6a";
    ctx.font = "bold 12px 'Inter', sans-serif";
    ctx.fillText("scoutme.co.za", 60, 970);

    // Centre Footer
    ctx.textAlign = "center";
    ctx.fillText("🇿🇦 Free for every player. Always.", 540, 970);

    // Right Footer
    ctx.textAlign = "right";
    ctx.fillStyle = "#00e56b";
    ctx.fillText("⚽ Join ScoutMe", 1020, 970);

    // Very bottom tag
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a3825";
    ctx.font = "800 11px 'Inter', sans-serif";
    ctx.fillText("FROM THE STREETS OF EKASI — TO THE SCREENS OF THE WORLD.", 540, 1010);

    // Convert to blob and share
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error("Blob conversion failed");
      const file = new File([blob], `ScoutMe_${player.name}_Report.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${player.name} — Neural Scout Intelligence Report`,
            text: `I just got my AI scouting report on ScoutMe! Score: ${report.overallScore}/100. ${overallRanking.percentile} ${player.position || 'CAM'} on ScoutMe. 🇿🇦⚽ Free for every player: scoutme.co.za`,
            files: [file]
          });
        } catch (err) {
          console.log("Share cancelled or failed, falling back to download", err);
          triggerDownload(blob, player.name);
        }
      } else {
        triggerDownload(blob, player.name);
      }
      setIsGenerating(false);
    }, 'image/png');

  } catch (error) {
    console.error("Canvas card generation error:", error);
    alert("Could not generate report card. Falling back...");
    setIsGenerating(false);
  }
};

const triggerDownload = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ScoutMe_${name}_Scout_Report.png`;
  a.click();
  URL.revokeObjectURL(url);
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // If we have more than maxLines, truncate the last allowed line with "..."
  if (lines.length > maxLines) {
    let lastLine = lines[maxLines - 1];
    if (lastLine.length > 3) {
      lastLine = lastLine.substring(0, lastLine.length - 4) + "...";
    } else {
      lastLine = "...";
    }
    lines = lines.slice(0, maxLines - 1);
    lines.push(lastLine);
  }

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i].trim(), x, y + (i * lineHeight));
  }
}
