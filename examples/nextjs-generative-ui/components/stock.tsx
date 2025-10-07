type StockProps = {
  price: number;
  symbol: string;
};

export function Stock({ price, symbol }: StockProps) {
  return (
    <div className="card" style={{ background: "rgba(22, 163, 74, 0.08)" }}>
      <header className="card-heading">
        <span aria-hidden="true" className="card-icon" data-variant="stock">
          📈
        </span>
        <div>
          <h2 className="card-header" style={{ color: "#15803d" }}>
            Stock Snapshot
          </h2>
          <p className="card-subheader">Latest quote supplied by the tool</p>
        </div>
      </header>
      <ul className="details-list">
        <li className="details-item">
          <span className="details-label">Symbol</span>
          <span className="details-value">{symbol}</span>
        </li>
        <li className="details-item">
          <span className="details-label">Price</span>
          <span className="details-value">${price.toFixed(2)}</span>
        </li>
      </ul>
    </div>
  );
}
