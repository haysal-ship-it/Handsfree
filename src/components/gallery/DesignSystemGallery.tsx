import * as React from 'react';
import { useTheme } from '@/src/hooks/useTheme';
import { Button } from '@/src/components/ui/button';
import { Switch } from '@/src/components/ui/switch';
import { Slider } from '@/src/components/ui/slider';
import { Badge } from '@/src/components/ui/badge';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/src/components/ui/sheet';
import { Toggle } from '@/src/components/ui/toggle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/src/components/ui/card';
import { Separator } from '@/src/components/ui/separator';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/src/components/ui/dialog';
import {
  Sun,
  Moon,
  Laptop,
  Touchpad,
  Sliders,
  Volume2,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react';

export function DesignSystemGallery() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [switchVal, setSwitchVal] = React.useState(true);
  const [sliderVal, setSliderVal] = React.useState([60]);
  const [toggleState, setToggleState] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-safe pt-safe px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-8">
      {/* Header Bar */}
      <header className="flex items-center justify-between gap-4 py-2">
        <div>
          <div className="flex items-center gap-2">
            <Touchpad className="h-7 w-7 text-accent" />
            <h1 className="text-large-title tracking-tight text-foreground">PocketPad</h1>
          </div>
          <p className="text-footnote text-muted mt-0.5">
            Design System Gallery &middot; Apple Human Interface Guidelines
          </p>
        </div>
        <Badge variant="default" className="shrink-0">
          Step 1: Tokens
        </Badge>
      </header>

      {/* Theme Controller */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-title">Appearance</CardTitle>
            <Badge variant={resolvedTheme === 'dark' ? 'default' : 'warning'}>
              Active: {resolvedTheme}
            </Badge>
          </div>
          <CardDescription>
            System-synchronized or manual override stored in localStorage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={theme}
            onValueChange={(val) => setTheme(val as 'system' | 'light' | 'dark')}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="system" className="gap-2">
                <Laptop className="h-4 w-4" />
                <span>System</span>
              </TabsTrigger>
              <TabsTrigger value="light" className="gap-2">
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </TabsTrigger>
              <TabsTrigger value="dark" className="gap-2">
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 1. Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Variants: default (accent), secondary (surface-raised), ghost, destructive. All &ge; 44px min touch height.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">Default Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>

          <Separator />

          <div>
            <p className="text-caption text-muted mb-2">Sizes (Default h-12, Sm h-11, Icon 44&times;44)</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="default">Default (h-12)</Button>
              <Button size="sm">Small (h-11)</Button>
              <Button size="icon" aria-label="Touchpad Icon">
                <Touchpad className="h-5 w-5" />
              </Button>
              <Button disabled variant="default">
                Disabled (40%)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Switch & Sliders */}
      <Card>
        <CardHeader>
          <CardTitle>Switch &amp; Slider Controls</CardTitle>
          <CardDescription>
            Native-like tactile response, 44px minimum hit targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-md bg-surface-raised border border-separator">
            <div className="space-y-0.5">
              <span className="text-headline block">Haptic Feedback</span>
              <span className="text-footnote text-muted block">
                Simulate trackpad click vibrations
              </span>
            </div>
            <Switch
              checked={switchVal}
              onCheckedChange={setSwitchVal}
              aria-label="Toggle haptic feedback"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-md bg-surface-raised border border-separator">
            <div className="space-y-0.5">
              <span className="text-headline block">Natural Scrolling (Disabled)</span>
              <span className="text-footnote text-muted block">
                Control disabled state opacity (40%)
              </span>
            </div>
            <Switch disabled checked={false} aria-label="Disabled switch" />
          </div>

          <div className="space-y-2 p-3 rounded-md bg-surface-raised border border-separator">
            <div className="flex justify-between items-center">
              <span className="text-headline flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                Cursor Tracking Speed
              </span>
              <span className="text-footnote font-mono text-muted">{sliderVal[0]}%</span>
            </div>
            <Slider
              value={sliderVal}
              onValueChange={setSliderVal}
              max={100}
              step={1}
              aria-label="Tracking speed slider"
            />
          </div>

          <div className="space-y-2 p-3 rounded-md bg-surface-raised border border-separator opacity-40">
            <div className="flex justify-between items-center">
              <span className="text-headline">Disabled Slider</span>
              <span className="text-footnote font-mono">35%</span>
            </div>
            <Slider disabled defaultValue={[35]} max={100} step={1} aria-label="Disabled slider" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>
            Semantic indicator badges with Apple HIG colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">Accent Default</Badge>
            <Badge variant="success">Connected (Success)</Badge>
            <Badge variant="warning">Reconnecting (Warning)</Badge>
            <Badge variant="danger">Disconnected (Danger)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 4. Toggles & Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Toggle &amp; Segmented Control (Tabs)</CardTitle>
          <CardDescription>
            iOS-style continuous rounded segments with spring transitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-caption text-muted mb-2">Toggles (&ge; 44px min height)</p>
            <div className="flex flex-wrap gap-2">
              <Toggle
                pressed={toggleState}
                onPressedChange={setToggleState}
                aria-label="Toggle mute"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Mute Audio
              </Toggle>
              <Toggle variant="outline" defaultPressed aria-label="Outline toggle">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Outline Active
              </Toggle>
              <Toggle disabled aria-label="Disabled toggle">
                Disabled
              </Toggle>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-caption text-muted mb-2">Segmented Control Tabs</p>
            <Tabs defaultValue="trackpad" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="trackpad">Trackpad</TabsTrigger>
                <TabsTrigger value="gestures">Gestures</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="trackpad" className="p-3 rounded-md bg-surface-raised border border-separator text-body">
                Large continuous trackpad surface with 1-finger pointer move and tap-to-click.
              </TabsContent>
              <TabsContent value="gestures" className="p-3 rounded-md bg-surface-raised border border-separator text-body">
                Two-finger scroll, pinch-to-zoom, and three-finger app switcher gestures.
              </TabsContent>
              <TabsContent value="settings" className="p-3 rounded-md bg-surface-raised border border-separator text-body">
                Sensitivity tuning, pointer acceleration curves, and haptic feedback.
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* 5. Modals: Sheet and Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Sheets &amp; Dialogs</CardTitle>
          <CardDescription>
            Bottom sheet with drag handle and centered modal dialog with glass materials
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {/* Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="default" className="gap-2">
                <Layers className="h-4 w-4" />
                Open Bottom Sheet
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Connection Status</SheetTitle>
                <SheetDescription>
                  PocketPad companion is listening on ws://192.168.1.100:8080.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-3">
                <div className="p-3 rounded-md bg-surface-raised border border-separator flex items-center justify-between">
                  <span className="text-headline">Latency</span>
                  <span className="text-footnote font-mono text-success">1.8 ms</span>
                </div>
                <div className="p-3 rounded-md bg-surface-raised border border-separator flex items-center justify-between">
                  <span className="text-headline">Protocol Version</span>
                  <span className="text-footnote font-mono">1.0.0</span>
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="secondary" className="w-full">
                    Close Sheet
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Open Modal Dialog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pair Laptop Companion</DialogTitle>
                <DialogDescription>
                  Scan QR code on your computer screen or enter the 4-digit pairing code shown in terminal.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-center">
                <div className="inline-block p-4 rounded-lg bg-surface-raised border border-separator font-mono text-title tracking-widest">
                  8 4 9 2
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="default" className="w-full">
                    Done
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* 6. Typography Scale & Design Tokens Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Apple HIG Typography Scale</CardTitle>
          <CardDescription>
            System font stack with designated sizes and weights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 divide-y divide-separator">
          <div className="pt-2">
            <span className="text-caption text-muted block">largeTitle (34/41 bold)</span>
            <span className="text-large-title text-foreground">PocketPad Touch</span>
          </div>
          <div className="pt-2">
            <span className="text-caption text-muted block">title (22/28 semibold)</span>
            <span className="text-title text-foreground">Companion Connection</span>
          </div>
          <div className="pt-2">
            <span className="text-caption text-muted block">headline (17/22 semibold)</span>
            <span className="text-headline text-foreground">High Precision Tracking</span>
          </div>
          <div className="pt-2">
            <span className="text-caption text-muted block">body (17/22 regular)</span>
            <span className="text-body text-foreground">
              Turn your smartphone into a smooth wireless trackpad with multi-touch gestures.
            </span>
          </div>
          <div className="pt-2">
            <span className="text-caption text-muted block">footnote (13/18 regular)</span>
            <span className="text-footnote text-muted">
              Requires Node.js companion app running on host computer.
            </span>
          </div>
          <div className="pt-2">
            <span className="text-caption text-muted block">caption (12/16 medium)</span>
            <span className="text-caption text-muted uppercase tracking-wider">
              Wi-Fi Direct &middot; Safe Area Aware
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 7. Color Tokens Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Color Tokens</CardTitle>
          <CardDescription>
            Defined as CSS variables on :root and .dark, mapped via Tailwind theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-md bg-background border border-separator space-y-1">
              <span className="text-caption text-muted block">background</span>
              <span className="text-footnote font-mono">bg-background</span>
            </div>
            <div className="p-3 rounded-md bg-surface border border-separator space-y-1">
              <span className="text-caption text-muted block">surface</span>
              <span className="text-footnote font-mono">bg-surface</span>
            </div>
            <div className="p-3 rounded-md bg-surface-raised border border-separator space-y-1">
              <span className="text-caption text-muted block">surface-raised</span>
              <span className="text-footnote font-mono">bg-surface-raised</span>
            </div>
            <div className="p-3 rounded-md bg-accent text-white space-y-1">
              <span className="text-caption opacity-80 block">accent</span>
              <span className="text-footnote font-mono">bg-accent</span>
            </div>
            <div className="p-3 rounded-md bg-success text-white space-y-1">
              <span className="text-caption opacity-80 block">success</span>
              <span className="text-footnote font-mono">bg-success</span>
            </div>
            <div className="p-3 rounded-md bg-warning text-white space-y-1">
              <span className="text-caption opacity-80 block">warning</span>
              <span className="text-footnote font-mono">bg-warning</span>
            </div>
            <div className="p-3 rounded-md bg-danger text-white space-y-1">
              <span className="text-caption opacity-80 block">danger</span>
              <span className="text-footnote font-mono">bg-danger</span>
            </div>
            <div className="p-3 rounded-md glass space-y-1 col-span-2 sm:col-span-1">
              <span className="text-caption text-muted block">.glass</span>
              <span className="text-footnote font-mono text-foreground">70% + blur</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer notice */}
      <footer className="text-center py-4">
        <p className="text-footnote text-muted flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent" />
          PocketPad Foundation &amp; Design System ready
        </p>
      </footer>
    </div>
  );
}
