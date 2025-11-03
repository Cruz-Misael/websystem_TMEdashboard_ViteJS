import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [tme, setTme] = useState(0);
  const [alerta, setAlerta] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        const tokenResp = await fetch("https://sebratel.native-infinity.com.br/api/token", {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer 9qXJ-4sE6-x8oB-syCn-w6Gu-UxBJ-Y4bg-0hrE",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "dev.sebratel",
            password: "dev.sebratel@2024",
          }),
        });

        const tokenData = await tokenResp.json();
        const jwt = tokenData.token || tokenData.access_token;

        const now = new Date();
        const primeiroDia = new Date(now.getFullYear(), now.getMonth(), 1);
        const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const formatarData = (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 00:00:00`;

        const reportResp = await fetch(
          `https://sebratel.native-infinity.com.br/api/apiReport/80?DATE_SUB(startTime%2C%20INTERVAL%203%20HOUR)={"type":"%3E%3D","value":"'${formatarData(primeiroDia)}'"}&DATE_SUB(startTime%2C%20INTERVAL%203%20HOUR)={"type":"%3C%3D","value":"'${formatarData(ultimoDia)}'"}&limit=&page=1`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );

        const dadosApi = await reportResp.json();
        const arrayDados = Array.isArray(dadosApi.data) ? dadosApi.data : [];

        const dadosFiltrados = arrayDados.filter((d) => d.Fila === "FILA_ATD_SUPORTE");
        setDados(dadosFiltrados);

        const tempos = dadosFiltrados
          .map((d) => d.Espera)
          .filter(Boolean)
          .map((tempo) => {
            const [h = 0, m = 0, s = 0] = tempo.split(":").map(Number);
            return h * 3600 + m * 60 + s;
          });

        const media = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
        setTme(media);
        setAlerta(media > 60);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }

    carregarDados();

    const intervalo = setInterval(() => {
      carregarDados();
    }, 1200000);

    return () => clearInterval(intervalo);
  }, []);

  // Agrupar por dia
  const tmePorDia = {};
  dados.forEach((d) => {
    const dia = d["Data/Hora"]?.split(" ")[0];
    if (!dia) return;

    const t = d.Espera || "00:00:00";
    const [h, m, s] = t.split(":").map(Number);
    const tempoSegundos = h * 3600 + m * 60 + s;

    if (!tmePorDia[dia]) tmePorDia[dia] = [];
    tmePorDia[dia].push(tempoSegundos);
  });

  const labels = Object.keys(tmePorDia).sort(
    (a, b) => new Date(a.split("/").reverse().join("-")) - new Date(b.split("/").reverse().join("-"))
  );

  const dataMedia = labels.map((dia) => {
    const tempos = tmePorDia[dia];
    return tempos.reduce((a, b) => a + b, 0) / tempos.length;
  });

  const dataGrafico = {
    labels,
    datasets: [
      {
        label: "TME diário (segundos)",
        data: dataMedia,
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.25)",
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: "#facc15",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        color: "#facc15",
        anchor: "end",
        align: "top",
        formatter: (value) => `${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`,
        font: { weight: "bold", size: 11 },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const segundos = context.raw;
            const min = Math.floor(segundos / 60);
            const seg = Math.floor(segundos % 60);
            return `Média: ${min}m ${seg}s`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.1)" },
        ticks: { color: "#e5e5e5" },
        title: {
          display: true,
          text: "TME médio (segundos)",
          color: "#facc15",
        },
      },
      x: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#f5f5f5" },
        title: {
          display: true,
          text: "Dia",
          color: "#facc15",
        },
      },
    },
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-neutral-900 to-black text-gray-100 font-sans">
      <div className="w-[90%] max-w-5xl h-[80vh] backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl border border-red-600/40 p-6 flex flex-col justify-between relative overflow-hidden">

        {/* Barra luminosa de alerta */}
        {alerta && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 animate-[pulse_2s_infinite]"></div>
        )}

        {/* Efeito Glow decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[20%] bg-red-500/10 blur-3xl rounded-full"></div>

        <h1 className="text-3xl font-semibold tracking-wide mb-2 text-center text-withe-400 drop-shadow">
          <img src="src\assets\logo_native.png" alt="Descrição da imagem" width="100" height="auto" />
          Painel de Chamadas Native - Mês Atual
        </h1>

        {alerta && (
          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 text-black font-semibold py-2 rounded-xl mb-3 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse border border-yellow-300/70">
            <span>⚠️</span>
            <span>
              TME médio acima de 1 minuto — {Math.floor(tme / 60)}m {Math.floor(tme % 60)}s
            </span>
          </div>
        )}

        <div className="flex-1">
          <Line data={dataGrafico} options={options} plugins={[ChartDataLabels]} />
        </div>

        <div className="text-center mt-4 text-sm text-gray-300">
          Média geral:{" "}
          <span className="text-yellow-400 font-bold">
            {Math.floor(tme / 60)}m {Math.floor(tme % 60)}s
          </span>
        </div>
      </div>
    </div>
  );
}
