import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ScoreChart({ data }) {
  const chartData = {
    labels: data.map((d) => d.title),
    datasets: [
      {
        label: 'AI Score',
        data: data.map((d) => d.score),
        backgroundColor: '#006699'
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      y: { beginAtZero: true, max: 3 }
    }
  };

  return <Bar data={chartData} options={options} />;
}
