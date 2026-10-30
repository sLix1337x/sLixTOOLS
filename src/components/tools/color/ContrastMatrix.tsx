import { sectionLabel } from '@/styles/constants';
import { contrastRatio, readableText, wcagLevel } from '@/utils/colorScheme';

const LEVEL_CLASSES = { AAA: 'text-emerald-300', AA: 'text-sky-300', Fail: 'text-red-300' };

const ContrastMatrix = ({ hexes }: { hexes: string[] }) => (
  <div>
    <h2 className={sectionLabel}>Contrast</h2>
    <p className="mb-2 mt-1 text-xs text-slate-300">
      WCAG ratio for normal text. Rows are the background, columns the text color.
    </p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <td />
            {hexes.map((hex, i) => (
              <th key={`${i}-${hex}`} scope="col" className="font-mono font-normal">
                <span
                  className="block rounded px-1 py-1"
                  style={{ backgroundColor: hex, color: readableText(hex) }}
                >
                  {hex.toUpperCase()}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hexes.map((background, row) => (
            <tr key={`${row}-${background}`}>
              <th scope="row" className="font-mono font-normal">
                <span
                  className="block rounded px-1 py-1"
                  style={{ backgroundColor: background, color: readableText(background) }}
                >
                  {background.toUpperCase()}
                </span>
              </th>
              {hexes.map((text, column) => {
                if (row === column) return <td key={column} className="text-center text-slate-500">–</td>;
                const ratio = contrastRatio(background, text);
                const level = wcagLevel(ratio);
                return (
                  <td key={column} className="overflow-hidden rounded bg-white/[0.05] p-0 text-center">
                    <span className="block py-1 font-semibold" style={{ backgroundColor: background, color: text }}>
                      Aa
                    </span>
                    <span className="block whitespace-nowrap px-1 py-0.5 text-slate-200">
                      {ratio.toFixed(2)} <span className={`font-semibold ${LEVEL_CLASSES[level]}`}>{level}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ContrastMatrix;
