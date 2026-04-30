import { useState, useEffect } from "react";

const ESP32_IP = "http://192.168.1.50/data";

export default function Dashboard() {

  const [data, setData] = useState({
    temperature: 0,
    humidity: 0,
    air_quality: 0,
    co2: 0
  });

  const [status, setStatus] = useState("Disconnected");

  useEffect(() => {

    const fetchData = async () => {
      try {

        const response = await fetch(ESP32_IP);
        const json = await response.json();

        setData(json);
        setStatus("Connected");

      } catch (error) {

        setStatus("Disconnected");

      }
    };

    fetchData();

    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);

  }, []);

  return (
    <div style={{ textAlign: "center", fontFamily: "Arial" }}>

      <h1>Environmental Monitoring Dashboard</h1>

      <h3>Status: {status}</h3>

      <h2>Temperature: {data.temperature} °C</h2>

      <h2>Humidity: {data.humidity} %</h2>

      <h2>Air Quality: {data.air_quality}</h2>

      <h2>CO₂ Level: {data.co2} ppm</h2>

    </div>
  );
}