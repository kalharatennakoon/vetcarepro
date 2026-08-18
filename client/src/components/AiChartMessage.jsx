import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * Renders the optional `chart` payload the AI assistant returns for an
 * explicit "graph/chart/plot this" request (see ml/scripts/rag/chart_intent.py).
 * Staff-only and web-only by construction - the ML layer never emits a chart
 * for guest or pet-owner roles, so this component is only ever reached from
 * the staff assistant page.
 *
 * `chart.type` picks the shape - 'bar' (default), 'pie', or 'line' - set
 * server-side, not this component's choice to make. 'line' is used for the
 * forecast/trend chart categories (disease trend, revenue forecast - see
 * ml/app.py's _disease_trend_chart/_revenue_forecast_chart) where the x-axis
 * is a sequence of months and a connecting line reads as the trend it is,
 * unlike a bar-per-month chart.
 *
 * Two bar rendering modes, chosen by the payload's `multi_color` flag:
 *   true  - one bar per row, each its own colour. Used for categorical
 *           breakdowns (status/category/severity) where every bar is a
 *           different thing and there is only one series.
 *   false - one bar per entry in `series`, coloured by series. Used for time
 *           series and for the two-series stock-vs-reorder comparison, where
 *           a per-bar colour would imply a distinction that isn't there.
 *
 * A pie slice's size only has room for one value, so it's always sized by
 * series[0] regardless of how many series the payload carries. Its hover
 * tooltip isn't limited the same way though - PieTooltip below reads every
 * series straight off the row's raw data, so a two-series payload (e.g.
 * completed vs. no-show counts per veterinarian) still shows both numbers
 * on hover even though only one of them drove the slice's size.
 */

// Same flavour as the COLORS array in pages/Reports.jsx, trimmed to the number
// of categories these charts realistically produce (8 disease categories and 6
// appointment statuses are the widest cases).
const CATEGORY_COLORS = [
  '#3b82f6', '#764ba2', '#fa709a', '#43e97b', '#f7971e',
  '#30cfd0', '#a18cd1', '#ee0979', '#0ba360', '#4facfe'
];

// Past this many bars the labels overlap at chat-bubble width, so they get
// angled and truncated instead of laid out flat.
const CROWDED_LABEL_THRESHOLD = 8;
const MAX_LABEL_CHARS = 14;

const truncate = (value) => {
  const label = String(value ?? '');
  return label.length > MAX_LABEL_CHARS ? `${label.slice(0, MAX_LABEL_CHARS - 1)}…` : label;
};

const formatValue = (value) =>
  typeof value === 'number' ? value.toLocaleString() : value;

// recharts' default pie Tooltip only knows about series[0] (the one dataKey
// actually driving slice size) - for a two-series payload like completed vs.
// no-show counts, that would hide the second number entirely. This reads
// every series straight off the hovered row's raw data instead, so all of
// them show up on hover regardless of which one sized the slice.
const PieTooltip = ({ active, payload, series }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="ai-chart-tooltip">
      <div className="ai-chart-tooltip-label">{row.label}</div>
      {series.map((s) => (
        <div key={s.key} className="ai-chart-tooltip-row">
          {s.name}: {formatValue(row[s.key])}
        </div>
      ))}
    </div>
  );
};

function AiChartMessage({ chart }) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return null;

  const { title, data, series = [], multi_color: multiColor, type } = chart;
  if (series.length === 0) return null;

  if (type === 'pie') {
    const valueKey = series[0].key;
    return (
      <div className="ai-message-chart">
        {title && <div className="ai-message-chart-title">{title}</div>}
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={95}
              label={({ label }) => truncate(label)}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={(props) => <PieTooltip {...props} series={series} />} />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const crowded = data.length > CROWDED_LABEL_THRESHOLD;

  if (type === 'line') {
    return (
      <div className="ai-message-chart">
        {title && <div className="ai-message-chart-title">{title}</div>}
        <ResponsiveContainer width="100%" height={crowded ? 320 : 280}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: crowded ? 56 : 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              style={{ fontSize: '0.7rem' }}
              interval={0}
              tickFormatter={crowded ? truncate : undefined}
              angle={crowded ? -35 : 0}
              textAnchor={crowded ? 'end' : 'middle'}
              height={crowded ? 60 : 30}
            />
            <YAxis style={{ fontSize: '0.7rem' }} allowDecimals={false} />
            <Tooltip formatter={formatValue} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: '0.75rem' }} />}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="ai-message-chart">
      {title && <div className="ai-message-chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={crowded ? 320 : 280}>
        <BarChart
          data={data}
          // Extra bottom room for the angled labels, so they aren't clipped.
          margin={{ top: 8, right: 12, left: 0, bottom: crowded ? 56 : 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            style={{ fontSize: '0.7rem' }}
            interval={0}
            tickFormatter={crowded ? truncate : undefined}
            angle={crowded ? -35 : 0}
            textAnchor={crowded ? 'end' : 'middle'}
            height={crowded ? 60 : 30}
          />
          <YAxis style={{ fontSize: '0.7rem' }} allowDecimals={false} />
          {/* The full label goes in the tooltip, so truncating the axis above
              never actually hides which bar is which. */}
          <Tooltip formatter={formatValue} />
          {!multiColor && series.length > 1 && <Legend wrapperStyle={{ fontSize: '0.75rem' }} />}

          {multiColor ? (
            <Bar dataKey={series[0].key} name={series[0].name} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Bar>
          ) : (
            series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
              />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AiChartMessage;
