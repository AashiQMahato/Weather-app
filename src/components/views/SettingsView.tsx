'use client';

import { Bot, Clock, Database, Palette, RotateCcw, Thermometer, Trash2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/layout/AppShell';
import { GhostButton } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { PageHeader } from '@/components/ui/PageStates';
import { Segmented } from '@/components/ui/Segmented';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useToast } from '@/providers/ToastProvider';
import { useAiStatus } from '@/providers/WeatherProvider';

function Row({ icon: Icon, title, description, children }: { icon: typeof Clock; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl glass-1 text-ink-2">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-ink-3">{description}</p>
        </div>
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

export function SettingsView() {
  const { units, setUnits, clock, setClock, recents, clearRecents, resetAll } = usePreferences();
  const ai = useAiStatus();
  const toast = useToast();

  return (
    <>
      <PageHeader title="Settings" description="Preferences are stored on this device only." />
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <Panel title="Display" className="divide-y divide-line">
          <Row icon={Thermometer} title="Temperature unit" description="Also switches wind, rain and pressure units.">
            <Segmented label="Temperature unit" value={units} onChange={setUnits} options={[{ value: 'metric', label: 'Celsius · metric' }, { value: 'imperial', label: 'Fahrenheit · imperial' }]} />
          </Row>
          <Row icon={Clock} title="Time format" description="Used for hours, sunrise and sunset.">
            <Segmented label="Time format" value={clock} onChange={setClock} options={[{ value: '12', label: '12-hour' }, { value: '24', label: '24-hour' }]} />
          </Row>
          <Row icon={Palette} title="Appearance" description="Auto follows your device setting.">
            <ThemeSwitcher />
          </Row>
        </Panel>

        <Panel title="Data & privacy" className="divide-y divide-line">
          <Row icon={Trash2} title="Recent searches" description={recents.length ? `${recents.length} saved on this device.` : 'No recent searches.'}>
            <GhostButton
              disabled={!recents.length}
              onClick={() => {
                clearRecents();
                toast('Recent searches cleared');
              }}
            >
              Clear
            </GhostButton>
          </Row>
          <Row icon={RotateCcw} title="Reset Skycast" description="Restores default places, units, theme and clears chat history.">
            <GhostButton
              onClick={() => {
                if (window.confirm('Reset all Skycast preferences on this device?')) {
                  resetAll();
                  toast('Preferences reset');
                }
              }}
            >
              Reset
            </GhostButton>
          </Row>
          <Row icon={Bot} title="AI features" description={ai.checked ? (ai.enabled ? `Enabled · model ${ai.model}` : `Unavailable · ${ai.reason ?? 'not configured'}`) : 'Checking…'}>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ai.enabled ? 'bg-good/15 text-good' : 'glass-1 text-ink-3'}`}>
              <span className={`size-1.5 rounded-full ${ai.enabled ? 'bg-good' : 'bg-ink-3'}`} aria-hidden />
              {ai.enabled ? 'Online' : 'Offline'}
            </span>
          </Row>
        </Panel>

        <Panel title="Data sources" className="lg:col-span-2">
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Forecast & air quality', 'Open-Meteo (CC BY 4.0), using national weather models and Copernicus CAMS.', 'https://open-meteo.com/'],
              ['Radar', 'RainViewer public radar mosaics.', 'https://www.rainviewer.com/'],
              ['Base maps', 'Esri (street map, imagery, gray canvas), © OpenStreetMap contributors, OpenTopoMap.', 'https://www.esri.com/'],
              ['Official alerts', 'US National Weather Service (United States only).', 'https://www.weather.gov/'],
              ['AI', 'Groq, running open models. AI text interprets the data above and can be wrong.', 'https://groq.com/'],
              ['Place names', 'Open-Meteo geocoding (GeoNames) and BigDataCloud reverse geocoding.', 'https://www.geonames.org/'],
            ].map(([title, body, href]) => (
              <li key={title} className="flex gap-3 rounded-2xl glass-1 p-4">
                <Database className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                <div>
                  <a href={href} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                    {title}
                  </a>
                  <p className="mt-0.5 text-ink-3">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
