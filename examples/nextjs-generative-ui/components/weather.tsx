type WeatherProps = {
  temperature: number;
  weather: string;
  location: string;
};

export function Weather({ temperature, weather, location }: WeatherProps) {
  return (
    <div className="card" style={{ background: "rgba(14, 116, 144, 0.08)" }}>
      <header className="card-heading">
        <span aria-hidden="true" className="card-icon" data-variant="weather">
          🌤️
        </span>
        <div>
          <h2 className="card-header" style={{ color: "#0e7490" }}>
            Weather Update
          </h2>
          <p className="card-subheader">
            Real-time forecast from the tool output
          </p>
        </div>
      </header>
      <ul className="details-list">
        <li className="details-item">
          <span className="details-label">Location</span>
          <span className="details-value">{location}</span>
        </li>
        <li className="details-item">
          <span className="details-label">Condition</span>
          <span className="details-value">{weather}</span>
        </li>
        <li className="details-item">
          <span className="details-label">Temperature</span>
          <span className="details-value">{temperature}&deg;C</span>
        </li>
      </ul>
    </div>
  );
}
