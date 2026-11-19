import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES,
  computeNames,
  findIssues,
  planRenames,
  renameScript,
  splitExt,
  type RenameRules,
} from './rename';

const rules = (over: Partial<RenameRules> = {}): RenameRules => ({ ...DEFAULT_RULES, ...over });
const names = (files: string[], over: Partial<RenameRules> = {}, taken: string[] = []) =>
  computeNames(files.map((name) => ({ name })), rules(over), taken);

const SFX = 'DOORSwng-Door_opening_Realist-Elevenlabs.mp3';

describe('computeNames', () => {
  it('removes words and cleans up into snake_case with a number', () => {
    expect(names([SFX], { removeWords: ['Elevenlabs', 'Realist'] })).toEqual(['door_swng_door_opening_001.mp3']);
  });

  it('uses a template with a number slot', () => {
    expect(names([SFX, 'other.MP3'], { template: 'door_open_{n}' })).toEqual([
      'door_open_001.mp3',
      'door_open_002.mp3',
    ]);
  });

  it('counts every distinct name on its own', () => {
    expect(names(['a.wav', 'b.wav', 'a (1).wav'], { replaceOn: true, replacements: [{ find: ' (1)', replace: '' }] }))
      .toEqual(['a_001.wav', 'b_001.wav', 'a_002.wav']);
  });

  it('continues after numbers already used by excluded files', () => {
    expect(names(['new.wav'], { template: 'door_open' }, ['door_open_003.wav', 'door_open_001.wav']))
      .toEqual(['door_open_004.wav']);
  });

  it('counts across the whole list in "all" scope', () => {
    expect(names(['x.png', 'y.png'], { template: 'tile', numberScope: 'all', numberPad: 2, numberStart: 0 }))
      .toEqual(['tile_00.png', 'tile_01.png']);
  });

  it('supports other case styles and keeps $ literal', () => {
    expect(names(['my cool-File.txt'], { caseStyle: 'pascal', numberOn: false })).toEqual(['MyCoolFile.txt']);
    expect(names(['my cool-File.txt'], { caseStyle: 'camel', numberOn: false })).toEqual(['myCoolFile.txt']);
    expect(names(['my cool-File.txt'], { caseStyle: 'kebab', numberOn: false })).toEqual(['my-cool-file.txt']);
    expect(names(['price $1.txt'], { caseStyle: 'keep', cleanupOn: false, numberOn: false })).toEqual(['price $1.txt']);
  });

  it('applies literal and regex replacements', () => {
    expect(names(['take_01.wav'], {
      replaceOn: true, replaceRegex: true, replacements: [{ find: '_(\\d+)$', replace: '-v$1' }],
      cleanupOn: false, caseStyle: 'keep', numberOn: false,
    })).toEqual(['take-v01.wav']);
  });

  it('changes or drops the extension', () => {
    expect(names(['a.JPEG'], { numberOn: false, extMode: 'set', extValue: '.jpg' })).toEqual(['a.jpg']);
    expect(names(['a.JPEG'], { numberOn: false, extMode: 'keep' })).toEqual(['a.JPEG']);
  });

  it('fills folder and date tokens', () => {
    const out = computeNames(
      [{ name: 'x.png', folder: 'Doors', lastModified: Date.UTC(2026, 10, 19) }],
      rules({ template: '{folder} {date}', numberOn: false })
    );
    expect(out).toEqual(['doors_2026_11_19.png']);
  });
});

describe('findIssues', () => {
  it('flags duplicates case-insensitively, taken names and Windows rules', () => {
    expect(findIssues(['a.txt', 'A.TXT', 'b.txt', 'con.txt', 'x?.txt', 'end.', 'free.txt'], ['b.txt'])).toEqual([
      'duplicate', 'duplicate', 'taken', 'reserved', 'invalid', 'trailing', null,
    ]);
  });
});

describe('planRenames', () => {
  it('swaps through temporary names', () => {
    const steps = planRenames([{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]);
    expect(steps).toHaveLength(4);
    expect(steps.slice(0, 2).map((s) => s.from)).toEqual(['a', 'b']);
    expect(steps.slice(2).map((s) => s.to)).toEqual(['b', 'a']);
  });

  it('renames directly when nothing is in the way and skips unchanged files', () => {
    expect(planRenames([{ from: 'a', to: 'c' }, { from: 'd', to: 'd' }])).toEqual([{ from: 'a', to: 'c' }]);
  });

  it('routes case-only changes through a temporary name', () => {
    expect(planRenames([{ from: 'door.wav', to: 'Door.wav' }])).toHaveLength(2);
  });
});

describe('renameScript', () => {
  it('quotes names for PowerShell and bash', () => {
    const steps = [{ from: "it's.wav", to: 'its.wav' }];
    expect(renameScript(steps, 'powershell')).toContain("Rename-Item -LiteralPath 'it''s.wav' -NewName 'its.wav'");
    expect(renameScript(steps, 'bash')).toContain("mv -n -- 'it'\\''s.wav' 'its.wav'");
  });
});

describe('splitExt', () => {
  it('treats dotfiles as names without extension', () => {
    expect(splitExt('.gitignore')).toEqual(['.gitignore', '']);
    expect(splitExt('a.b.c')).toEqual(['a.b', 'c']);
  });
});
