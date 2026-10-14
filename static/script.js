/**
 * DIABETES RISK PREDICTION - BIOMEDICAL ENGINEERING CLINICAL CHARTS
 */

document.addEventListener("DOMContentLoaded", () => {
    initSampleDataPresets();
    initPredictionCharts();
    initDashboardTrendChart();
    initDownloadButton();
});

/**
 * Quick-fill presets for easy demonstration and testing
 */
function initSampleDataPresets() {
    const normalBtn = document.getElementById("fill-normal-btn");
    const highRiskBtn = document.getElementById("fill-highrisk-btn");

    if (normalBtn) {
        normalBtn.addEventListener("click", () => {
            setInputValue("patient_name", "Patient #1");
            setInputValue("pregnancies", 1);
            setInputValue("glucose", 92);
            setInputValue("blood_pressure", 68);
            setInputValue("skin_thickness", 20);
            setInputValue("insulin", 72);
            setInputValue("bmi", 22.8);
            setInputValue("diabetes_pedigree", 0.245);
            setInputValue("age", 28);
            highlightFormInputs();
        });
    }

    if (highRiskBtn) {
        highRiskBtn.addEventListener("click", () => {
            setInputValue("patient_name", "prasa");
            setInputValue("pregnancies", 5);
            setInputValue("glucose", 168);
            setInputValue("blood_pressure", 84);
            setInputValue("skin_thickness", 32);
            setInputValue("insulin", 180);
            setInputValue("bmi", 34.6);
            setInputValue("diabetes_pedigree", 0.68);
            setInputValue("age", 48);
            highlightFormInputs();
        });
    }
}

function setInputValue(name, value) {
    const el = document.querySelector(`input[name="${name}"]`);
    if (el) {
        el.value = value;
    }
}

function highlightFormInputs() {
    const inputs = document.querySelectorAll(".prediction-form input");
    inputs.forEach(input => {
        input.style.borderColor = "#00c49f";
        setTimeout(() => {
            input.style.borderColor = "";
        }, 600);
    });
}

/**
 * Initialize Chart.js interactive charts on the Prediction Result page (Dark Theme)
 */
function initPredictionCharts() {
    // 1. Risk Gauge Chart
    const gaugeCanvas = document.getElementById("riskGaugeChart");
    if (gaugeCanvas && window.predictionData) {
        const prob = window.predictionData.probability || 0;
        let color = "#00c49f"; // Mint Teal (Medium / Favorable)
        if (prob >= 70) color = "#ef4444"; // Red (High Risk)
        else if (prob < 40) color = "#3b82f6"; // Blue (Low Risk)

        const remaining = Math.max(0, 100 - prob);

        new Chart(gaugeCanvas, {
            type: "doughnut",
            data: {
                labels: ["Estimated Risk", "Safe Buffer"],
                datasets: [{
                    data: [prob, remaining],
                    backgroundColor: [color, "#162238"],
                    borderWidth: 0,
                    circumference: 240,
                    rotation: 240,
                    cutout: "76%"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    animateRotate: true,
                    duration: 1200
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0d172b",
                        borderColor: "#1e293b",
                        borderWidth: 1,
                        titleColor: "#ffffff",
                        bodyColor: "#cbd5e1",
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Metrics Benchmark Comparison Bar Chart (Dark Theme)
    const barCanvas = document.getElementById("benchmarkBarChart");
    if (barCanvas && window.predictionData) {
        const data = window.predictionData;

        new Chart(barCanvas, {
            type: "bar",
            data: {
                labels: data.labels || ["Glucose", "Blood Pressure", "BMI", "Insulin", "Age"],
                datasets: [
                    {
                        label: "Patient Metric",
                        data: data.userVals || [],
                        backgroundColor: "#00c49f",
                        borderRadius: 5,
                        borderSkipped: false
                    },
                    {
                        label: "Healthy Benchmark",
                        data: data.healthyVals || [],
                        backgroundColor: "#3b82f6",
                        borderRadius: 5,
                        borderSkipped: false
                    },
                    {
                        label: "Diabetic Benchmark",
                        data: data.diabeticVals || [],
                        backgroundColor: "#ef4444",
                        borderRadius: 5,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: "circle",
                            font: { family: "Plus Jakarta Sans", size: 11, weight: 600 },
                            color: "#cbd5e1"
                        }
                    },
                    tooltip: {
                        backgroundColor: "#0d172b",
                        borderColor: "#1e293b",
                        borderWidth: 1,
                        titleFont: { family: "Plus Jakarta Sans", size: 12, weight: 700 },
                        bodyFont: { family: "Plus Jakarta Sans", size: 12 },
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "Plus Jakarta Sans", size: 11, weight: 600 },
                            color: "#94a3b8"
                        }
                    },
                    y: {
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: {
                            font: { family: "Plus Jakarta Sans", size: 11 },
                            color: "#64748b"
                        }
                    }
                }
            }
        });
    }
}

/**
 * Initialize Timeline Trend Chart on User Dashboard
 */
function initDashboardTrendChart() {
    const trendCanvas = document.getElementById("trendLineChart");
    if (trendCanvas && window.dashboardTrendData) {
        const trend = window.dashboardTrendData;

        new Chart(trendCanvas, {
            type: "line",
            data: {
                labels: trend.labels || [],
                datasets: [
                    {
                        label: "Risk Probability (%)",
                        data: trend.probabilities || [],
                        borderColor: "#00c49f",
                        backgroundColor: "rgba(0, 196, 159, 0.12)",
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        yAxisID: "y"
                    },
                    {
                        label: "Fasting Glucose (mg/dL)",
                        data: trend.glucoses || [],
                        borderColor: "#3b82f6",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.35,
                        yAxisID: "y1"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            font: { family: "Plus Jakarta Sans", size: 11, weight: 600 },
                            color: "#cbd5e1"
                        }
                    },
                    tooltip: {
                        backgroundColor: "#0d172b",
                        borderColor: "#1e293b",
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "Plus Jakarta Sans", size: 11 }, color: "#94a3b8" }
                    },
                    y: {
                        type: "linear",
                        display: true,
                        position: "left",
                        title: { display: true, text: "Risk (%)", color: "#00c49f", font: { weight: 600 } },
                        min: 0,
                        max: 100,
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#64748b" }
                    },
                    y1: {
                        type: "linear",
                        display: true,
                        position: "right",
                        title: { display: true, text: "Glucose (mg/dL)", color: "#3b82f6", font: { weight: 600 } },
                        grid: { drawOnChartArea: false },
                        ticks: { color: "#64748b" }
                    }
                }
            }
        });
    }
}

/**
 * 1-Click Download for the Generated Matplotlib Medical Chart
 */
function initDownloadButton() {
    const downloadBtn = document.getElementById("download-graph-btn");
    const chartImg = document.getElementById("matplotlib-chart-img");

    if (downloadBtn && chartImg) {
        downloadBtn.addEventListener("click", () => {
            const link = document.createElement("a");
            link.href = chartImg.src;
            link.download = `Biomedical_Diabetes_Diagnostic_Report_${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}
