import {
  BarChart,
  Bar,
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
 * Two rendering modes, chosen by the payload's `multi_color` flag:
 *   true  - one bar per row, each its own colour. Used for categorical
 *           breakdowns (status/category/severity) where every bar is a
 *           different thing and there is only one series.
 *   false - one bar per entry in `series`, coloured by series. Used for time
 *           series and for the two-series stock-vs-reorder comparison, where
 *           a per-bar colour would imply a distinction that isn't there.
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

function AiChartMessage({ chart }) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return null;

  const { title, data, series = [], multi_color: multiColor } = chart;
  if (series.length === 0) return null;

  const crowded = data.length > CROWDED_LABEL_THRESHOLD;

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
