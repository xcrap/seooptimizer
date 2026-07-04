import React, { useState, useEffect, useRef } from "react";
import {
Copy,
Settings,
Wand2,
Sparkles,
LayoutTemplate,
Search,
TextQuote,
FileJson,
SlidersHorizontal,
Check,
Trash2,
Plus,
Edit2,
Save,
X,
MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import defaultPresets from "@/presets.json";

export default function SeoOptimizer() {
// State
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");

// Results State
const [optimizedTitle, setOptimizedTitle] = useState("");
const [optimizedDescriptions, setOptimizedDescriptions] = useState([]);

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [serviceStatus, setServiceStatus] = useState({
    providerLabel: "Local Codex",
    model: "gpt-5.4-mini",
    reasoningEffort: "medium",
    ready: null
});

// Settings State
const [systemPrompt, setSystemPrompt] = useState(defaultPresets[0].systemPrompt);
const [titleMin, setTitleMin] = useState(defaultPresets[0].titleMin);
const [titleMax, setTitleMax] = useState(defaultPresets[0].titleMax);
const [descMin, setDescMin] = useState(defaultPresets[0].descMin);
const [descMax, setDescMax] = useState(defaultPresets[0].descMax);

// Presets Management
const [presets, setPresets] = useState([]);
const [currentPresetId, setCurrentPresetId] = useState(defaultPresets[0].id);
const [showAdvanced, setShowAdvanced] = useState(false);

// Preset Manager State
const [showPresetManager, setShowPresetManager] = useState(false);
const [editingPreset, setEditingPreset] = useState(null);
const [draftLoaded, setDraftLoaded] = useState(false);
const [savedPresetSignature, setSavedPresetSignature] = useState("");
const draftTouchedRef = useRef(false);

// Load saved data from SQLite, migrating old browser storage when present.
useEffect(() => {
    let cancelled = false;

    const applyPresetFromList = (nextPresets, preferredPresetId = "") => {
        const selectedPreset =
            nextPresets.find(p => p.id === preferredPresetId) ||
            nextPresets.find(p => p.id === defaultPresets[0].id) ||
            nextPresets[0];

        if (selectedPreset) {
            setCurrentPresetId(selectedPreset.id);
            setSystemPrompt(selectedPreset.systemPrompt);
            setTitleMin(selectedPreset.titleMin);
            setTitleMax(selectedPreset.titleMax);
            setDescMin(selectedPreset.descMin);
            setDescMax(selectedPreset.descMax);
        }
    };

    const loadStoredData = async () => {
        const browserStorage = readBrowserStorageSnapshot();

        try {
            let nextPresets = [];
            let nextDraft = null;

            if (browserStorage.hasData) {
                const response = await fetch("/api/presets/migrate-browser-storage", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        presets: browserStorage.presets,
                        draft: browserStorage.draft
                    })
                });
                const parsed = await parseApiResponse(response);
                nextPresets = parsed.presets;
                nextDraft = parsed.draft;
                clearBrowserStorageSnapshot();
            } else {
                const [presetsResponse, draftResponse] = await Promise.all([
                    fetch("/api/presets"),
                    fetch("/api/draft")
                ]);
                const presetsPayload = await parseApiResponse(presetsResponse);
                nextDraft = await parseApiResponse(draftResponse);
                nextPresets = presetsPayload.presets;
            }

            if (cancelled) return;

            const storedPresets = Array.isArray(nextPresets) ? nextPresets : defaultPresets;
            setPresets(storedPresets);
            applyPresetFromList(storedPresets, nextDraft?.currentPresetId);

            if (nextDraft && !draftTouchedRef.current) {
                setTitle(nextDraft.title || "");
                setDescription(nextDraft.description || "");
            }
        } catch (error) {
            console.error("Failed to load saved presets", error);
            if (!cancelled) {
                setPresets(defaultPresets);
                applyPresetFromList(defaultPresets);
                setError(error.message || "Failed to load saved presets.");
            }
        } finally {
            if (!cancelled) setDraftLoaded(true);
        }
    };

    loadStoredData();

    return () => {
        cancelled = true;
    };
}, []);

// Load local AI service status
useEffect(() => {
fetch("/api/status")
    .then(response => response.ok ? response.json() : null)
    .then(status => {
        if (status) setServiceStatus(status);
    })
    .catch(() => {
        setServiceStatus({
            providerLabel: "Local AI",
            model: "offline",
            reasoningEffort: "unknown",
            ready: false
        });
    });
}, []);

// Save drafts to SQLite after the initial database load.
useEffect(() => {
    if (!draftLoaded) return;

    const timeout = window.setTimeout(() => {
        fetch("/api/draft", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title, description })
        }).catch(error => {
            console.error("Failed to save draft", error);
        });
    }, 400);

    return () => window.clearTimeout(timeout);
}, [title, description, draftLoaded]);

// Handle ESC key to close manager
useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === "Escape" && showPresetManager) {
            setShowPresetManager(false);
        }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
}, [showPresetManager]);

const updateTitle = (value) => {
draftTouchedRef.current = true;
setTitle(value);
};

const updateDescription = (value) => {
draftTouchedRef.current = true;
setDescription(value);
};

const applyPresetValues = (preset) => {
setSystemPrompt(preset.systemPrompt);
setTitleMin(preset.titleMin);
setTitleMax(preset.titleMax);
setDescMin(preset.descMin);
setDescMax(preset.descMax);
};

const persistCurrentPresetId = async (currentPresetId) => {
try {
const response = await fetch("/api/current-preset", {
    method: "PUT",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ currentPresetId })
});
await parseApiResponse(response);
return true;
} catch (error) {
console.error("Failed to save current preset", error);
setError(error.message || "Failed to save current preset.");
return false;
}
};

const savePresetList = async (nextPresets, preferredPresetId = currentPresetId) => {
try {
setError(null);
const response = await fetch("/api/presets", {
    method: "PUT",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ presets: nextPresets })
});
const parsed = await parseApiResponse(response);
const savedPresets = Array.isArray(parsed.presets) ? parsed.presets : nextPresets;
const selectedPreset = savedPresets.find(p => p.id === preferredPresetId) || savedPresets[0];

setPresets(savedPresets);

if (selectedPreset) {
    setCurrentPresetId(selectedPreset.id);
    applyPresetValues(selectedPreset);
    await persistCurrentPresetId(selectedPreset.id);
} else {
    setCurrentPresetId("");
    await persistCurrentPresetId("");
}

return savedPresets;
} catch (error) {
console.error("Failed to save presets", error);
setError(error.message || "Failed to save presets.");
return null;
}
};

// Apply Preset
const applyPreset = (id) => {
const preset = presets.find(p => p.id === id);
if (preset) {
setCurrentPresetId(id);
applyPresetValues(preset);
void persistCurrentPresetId(id);
}
};

const saveCurrentPreset = async () => {
const preset = presets.find(p => p.id === currentPresetId);
if (!preset) return;

const nextPreset = {
    ...preset,
    systemPrompt,
    titleMin,
    titleMax,
    descMin,
    descMax
};
const savedPresets = await savePresetList(
    presets.map(p => p.id === currentPresetId ? nextPreset : p),
    currentPresetId
);

if (savedPresets) {
    setSavedPresetSignature(getPresetSignature(currentPresetId, nextPreset));
}
};

const currentPreset = presets.find(p => p.id === currentPresetId);
const currentPresetHasChanges = Boolean(currentPreset && (
    currentPreset.systemPrompt !== systemPrompt ||
    currentPreset.titleMin !== titleMin ||
    currentPreset.titleMax !== titleMax ||
    currentPreset.descMin !== descMin ||
    currentPreset.descMax !== descMax
));
const currentPresetSignature = currentPreset ? getPresetSignature(currentPresetId, {
    ...currentPreset,
    systemPrompt,
    titleMin,
    titleMax,
    descMin,
    descMax
}) : "";
const presetSaveStatus = savedPresetSignature && savedPresetSignature === currentPresetSignature ? "Saved" : "";

const getLengthColor = (current, min, max) => {
if (current === 0) return "text-muted-foreground";
if (current < min || current> max) return "text-destructive";
    return "text-primary";
    };

    const optimize = async () => {
    if (!title && !description) return;

    setError(null);
    setLoading(true);
    setOptimizedTitle("");
    setOptimizedDescriptions([]);
    try {
    const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title,
            description,
            systemPrompt,
            titleMin,
            titleMax,
            descMin,
            descMax
        })
    });

    const parsed = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(parsed.error || "Optimization failed. Please try again.");
    }

    setServiceStatus({
        providerLabel: parsed.providerLabel || serviceStatus.providerLabel,
        model: parsed.model || serviceStatus.model,
        reasoningEffort: parsed.reasoningEffort || serviceStatus.reasoningEffort,
        ready: true
    });
    setOptimizedTitle(parsed.title || "");

    if (Array.isArray(parsed.description_variants)) {
    setOptimizedDescriptions(parsed.description_variants);
    } else if (parsed.description) {
    setOptimizedDescriptions([parsed.description]);
    } else {
    setOptimizedDescriptions([]);
    }

    } catch (error) {
    console.error("Optimization failed", error);
    setError(error.message || "Optimization failed. Please try again.");
    } finally {
    setLoading(false);
    }
    };

    const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    };

    return (
    <div
        className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
        {/* Fixed Header */}
        <div
            className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-xl z-50 flex items-center justify-between px-6">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={()=> {
                setOptimizedTitle("");
                setOptimizedDescriptions([]);
                }}
                >
                <h1 className="text-md tracking-[0.2em] text-foreground font-light">
                    <span className="font-bold text-primary">SEO</span> OPTIMIZER
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 mr-2">
                    <Label className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Active Preset</Label>
                    <Select value={currentPresetId} onValueChange={applyPreset}>
                        <SelectTrigger
                            className="w-[180px] h-9 bg-zinc-900 border-zinc-800 text-xs font-medium text-zinc-300 focus:ring-zinc-700 focus:ring-offset-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                            {presets.map(p => (
                            <SelectItem key={p.id} value={p.id}
                                className="text-xs focus:bg-zinc-800 focuointer">{p.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="h-6 w-px bg-zinc-800 mx-2" />

                <Button variant="ghost" size="sm"
                    className="h-9 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 gap-2 focus-visible:ring-0" onClick={()=>
                    setShowPresetManager(true)}
                    >
                    <Settings className="h-4 w-4" />
                    Manage Presets
                </Button>
            </div>
        </div>

        {/* Main Layout - Top Padding for Header, Bottom Padding for Footer */}
        <div className="flex w-full h-full pt-16 pb-20">

            {/* Left Sidebar - Input */}
            <div className="w-[420px] bg-background border-r border-border flex flex-col shrink-0">
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">

                    <div className="space-y-8">
                        {/* Title Input */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label
                                    className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <LayoutTemplate className="h-3.5 w-3.5 text-primary" /> Title
                                </Label>
                                <span
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                                    {title.length}
                                </span>
                            </div>
                            <Textarea id="input-title" value={title} onChange={e=> updateTitle(e.target.value)}
                                    placeholder="Enter your current page title..."
                                    className="min-h-[100px] bg-muted/50 border-input/80 text-sm resize-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all placeholder:text-muted-foreground"
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <TextQuote className="h-3.5 w-3.5 text-primary" /> Description
                                    </Label>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                                        {description.length}
                                    </span>
                                </div>
                                <Textarea
                                    id="input-description"
                                    value={description}
                                    onChange={e => updateDescription(e.target.value)}
                                    placeholder="Enter your current meta description..."
                                    className="min-h-[180px] bg-muted/50 border-input/80 text-sm resize-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all placeholder:text-muted-foreground"
                                />
                                <div className="flex justify-end pt-2 px-1">
                                    <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/50">
                                        <Sparkles className="h-3 w-3 opacity-50" />
                                        {serviceStatus.providerLabel}: {serviceStatus.model} / {serviceStatus.reasoningEffort}
                                    </span>
                                </div>
                            </div>

                            {/* Advanced Config Toggle */}
                            <div className="pt-4 border-t border-zinc-900">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-zinc-400 hover:text-white justify-between group"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                >
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        Advanced Configuration
                                    </div>
                                    <Check className={cn("h-3.5 w-3.5 transition-opacity", showAdvanced ? "opacity-100" : "opacity-0")} />
                                </Button>

                                {showAdvanced && (
                                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-zinc-500 uppercase font-bold">System Prompt</Label>
                                            <Textarea
                                                value={systemPrompt}
                                                onChange={e => setSystemPrompt(e.target.value)}
                                                className="min-h-[80px] bg-zinc-900/50 border-zinc-800 text-[11px] font-mono text-zinc-400 focus-visible:ring-zinc-700"
                                            />
                                        </div>
	                                        <div className="grid grid-cols-2 gap-4">
	                                            <div className="space-y-2">
	                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Title Range</Label>
	                                                <div className="flex gap-2">
	                                                    <Input type="number" value={titleMin} onChange={e => setTitleMin(Number(e.target.value))} className="h-7 text-xs bg-zinc-900/50 border-zinc-800" />
                                                    <Input type="number" value={titleMax} onChange={e => setTitleMax(Number(e.target.value))} className="h-7 text-xs bg-zinc-900/50 border-zinc-800" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Desc Range</Label>
                                                <div className="flex gap-2">
                                                    <Input type="number" value={descMin} onChange={e => setDescMin(Number(e.target.value))} className="h-7 text-xs bg-zinc-900/50 border-zinc-800" />
	                                                    <Input type="number" value={descMax} onChange={e => setDescMax(Number(e.target.value))} className="h-7 text-xs bg-zinc-900/50 border-zinc-800" />
	                                                </div>
	                                            </div>
	                                        </div>
	                                        <div className="flex items-center justify-between gap-3 pt-1">
	                                            <span className={cn(
	                                                "text-[10px] font-mono truncate",
	                                                presetSaveStatus ? "text-primary" : currentPresetHasChanges ? "text-yellow-400" : "text-zinc-600"
	                                            )}>
	                                                {presetSaveStatus || (currentPresetHasChanges ? "Unsaved preset changes" : "Preset saved")}
	                                            </span>
	                                            <Button
	                                                type="button"
	                                                size="sm"
	                                                variant="outline"
	                                                disabled={!currentPreset || !currentPresetHasChanges}
	                                                onClick={saveCurrentPreset}
	                                                className="h-8 shrink-0 text-xs border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
	                                            >
	                                                <Save className="h-3.5 w-3.5 mr-2" />
	                                                Save Preset
	                                            </Button>
	                                        </div>
	                                    </div>
	                                )}
	                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Content - Results */}
                <div className="flex-1 bg-background relative overflow-hidden flex flex-col">
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-linear-to-br from-zinc-900/50 via-zinc-950/50 to-zinc-950 pointer-events-none" />

                    {loading ? null : (!optimizedTitle && optimizedDescriptions.length === 0) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 animate-in fade-in zoom-in-95 duration-500">
                            <p className="text-sm font-mono tracking-widest lowercase opacity-50">waiting for input...</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-12 max-w-6xl mx-auto w-full space-y-12">
                            {/* Title Section */}
                            <div className="space-y-5 animate-in slide-in-from-bottom-5 fade-in duration-500">
                                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <LayoutTemplate className="h-4 w-4 text-primary" />
                                        Optimized Title Tag
                                    </h2>
                                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800", getLengthColor(optimizedTitle.length, titleMin, titleMax))}>
                                        {optimizedTitle.length} chars
                                    </span>
                                </div>
                                
                                <div className="group relative rounded-xl bg-linear-to-br from-card/80 to-card/40 border border-border/80 p-1 hover:border-primary/30 transition-all duration-300 shadow-xl shadow-black/20">
                                    <div className="relative p-6 bg-card/50 rounded-[10px]">
                                         <p className="text-2xl font-medium text-white tracking-tight">{optimizedTitle}</p>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 bg-muted text-muted-foreground hover:text-primary-foreground hover:bg-primary border border-border hover:border-primary transition-all"
                                            onClick={() => copyToClipboard(optimizedTitle)}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Description Variants Section */}
                            <div className="space-y-5 animate-in slide-in-from-bottom-8 fade-in duration-500 delay-100">
                                 <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <TextQuote className="h-4 w-4 text-primary" />
                                        Description Variants
                                    </h2>
                                    <span className="text-[10px] text-zinc-600 bg-zinc-900/50 px-2 py-1 rounded">3 options</span>
                                </div>

                                <div className="grid gap-5">
                                    {optimizedDescriptions.map((desc, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative rounded-xl bg-zinc-900/20 border border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700 hover:shadow-lg transition-all duration-300"
                                        >
                                            <div className="p-6 pr-14">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 font-medium uppercase tracking-wider">
                                                        Variant {idx + 1}
                                                    </span>
                                                    <span className={cn("text-[10px] font-mono", getLengthColor(desc.length, descMin, descMax))}>
                                                        {desc.length} chars
                                                    </span>
                                                </div>
                                                <p className="text-zinc-300 leading-relaxed text-sm">{desc}</p>
                                            </div>
                                            <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 bg-muted text-muted-foreground hover:text-primary-foreground hover:bg-primary border border-border hover:border-primary"
                                                    onClick={() => copyToClipboard(desc)}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Fixed Footer */}
            {/* Fixed Footer */}
            <div className="fixed bottom-0 left-0 right-0 h-20 border-t border-border bg-background/80 backdrop-blur-xl z-50 flex items-center justify-end px-8">
                <div className="flex items-center gap-4 w-full justify-end">
                    {error && (
                        <p className="text-red-400 text-xs animate-in fade-in slide-in-from-bottom-1 mr-4">{error}</p>
                    )}
                    <Button
                        id="btn-optimize"
                        onClick={optimize}
                        disabled={loading || (!title && !description)}
                        className="w-[240px] h-11 bg-card hover:bg-muted text-foreground border border-border hover:border-input font-medium tracking-wide transition-all shadow-lg hover:shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        {loading ? (
                            <div className="flex items-center gap-2 justify-center">
                                <div className="h-4 w-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                                <span className="text-zinc-400">Optimizing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 justify-center">
                                <Wand2 className="h-4 w-4 text-primary group-hover:text-primary transition-colors" />
                                <span>Generate Optimization</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>

            {/* Preset Manager Overlay */}
            {showPresetManager && (
                <div className="fixed inset-0 z-100 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl flex flex-col bg-card border-border text-foreground shadow-2xl max-h-[85vh]">
                        <CardHeader className="border-b border-border bg-background py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    {editingPreset ? (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2 mr-1" onClick={() => setEditingPreset(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                            {editingPreset.id === 'new' ? 'Create New Preset' : 'Edit Preset'}
                                        </>
                                    ) : (
                                        <>
                                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                                            Manage Presets
                                        </>
                                    )}
                                </CardTitle>
                                {!editingPreset && (
                                    <div className="flex gap-2">
                                        <div className="flex bg-zinc-900 rounded-md border border-zinc-800 mr-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-zinc-400 hover:text-white px-3 border-r border-zinc-800 rounded-r-none"
                                                title="Import Presets"
                                                onClick={() => document.getElementById('preset-import').click()}
                                            >
                                                <FileJson className="h-3.5 w-3.5 mr-2" />
                                                Import
                                            </Button>
                                            <input
                                                id="preset-import"
                                                type="file"
                                                className="hidden"
                                                accept="application/json"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;
                                                    
                                                    const reader = new FileReader();
                                                    reader.onload = async (event) => {
                                                        try {
                                                            const imported = JSON.parse(event.target.result);
                                                            if (Array.isArray(imported)) {
                                                                if (confirm(`Import ${imported.length} presets? This will replace your current list.`)) {
                                                                    await savePresetList(imported, imported[0]?.id || currentPresetId);
                                                                }
                                                            } else {
                                                                alert('Invalid preset file format');
                                                            }
                                                        } catch {
                                                            alert('Failed to parse JSON file');
                                                        }
                                                    };
                                                    reader.readAsText(file);
                                                    e.target.value = null;
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-zinc-400 hover:text-white px-3 rounded-l-none"
                                                title="Export to JSON"
                                                onClick={() => {
                                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
                                                    const downloadAnchorNode = document.createElement('a');
                                                    downloadAnchorNode.setAttribute("href", dataStr);
                                                    downloadAnchorNode.setAttribute("download", "seo-presets.json");
                                                    document.body.appendChild(downloadAnchorNode);
                                                    downloadAnchorNode.click();
                                                    downloadAnchorNode.remove();
                                                }}
                                            >
                                                <Save className="h-3.5 w-3.5 mr-2" />
                                                Export
                                            </Button>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white"
                                            onClick={() => setShowPresetManager(false)}
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                                            onClick={() => setEditingPreset({
                                                id: 'new',
                                                name: '',
                                                systemPrompt: '',
                                                titleMin: 50,
                                                titleMax: 60,
                                                descMin: 140,
                                                descMax: 160
                                            })}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Preset
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        
                        <CardContent className="flex-1 overflow-y-auto p-0 relative scrollbar-thin scrollbar-thumb-zinc-800">
                            {editingPreset ? (
                                <div className="p-6 space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-xs text-zinc-500 uppercase font-bold">Preset Name</Label>
                                        <Input
                                            value={editingPreset.name}
                                            onChange={e => setEditingPreset({...editingPreset, name: e.target.value})}
                                            placeholder="e.g. E-commerce Product"
                                            className="bg-zinc-900/50 border-zinc-800"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-xs text-zinc-500 uppercase font-bold">System Prompt</Label>
                                        <Textarea
                                            value={editingPreset.systemPrompt}
                                            onChange={e => setEditingPreset({...editingPreset, systemPrompt: e.target.value})}
                                            placeholder="Instructions for the AI..."
                                            className="min-h-[120px] bg-zinc-900/50 border-zinc-800 font-mono text-xs leading-relaxed"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-xs text-zinc-500 uppercase font-bold">Title Length</Label>
                                            <div className="flex gap-3">
                                                <div className="space-y-1 flex-1">
                                                    <span className="text-[10px] text-zinc-600">Min</span>
                                                    <Input type="number" value={editingPreset.titleMin} onChange={e => setEditingPreset({...editingPreset, titleMin: parseInt(e.target.value)})} className="bg-zinc-900/50 border-zinc-800 h-8" />
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <span className="text-[10px] text-zinc-600">Max</span>
                                                    <Input type="number" value={editingPreset.titleMax} onChange={e => setEditingPreset({...editingPreset, titleMax: parseInt(e.target.value)})} className="bg-zinc-900/50 border-zinc-800 h-8" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-xs text-zinc-500 uppercase font-bold">Description Length</Label>
                                            <div className="flex gap-3">
                                                <div className="space-y-1 flex-1">
                                                    <span className="text-[10px] text-zinc-600">Min</span>
                                                    <Input type="number" value={editingPreset.descMin} onChange={e => setEditingPreset({...editingPreset, descMin: parseInt(e.target.value)})} className="bg-zinc-900/50 border-zinc-800 h-8" />
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <span className="text-[10px] text-zinc-600">Max</span>
                                                    <Input type="number" value={editingPreset.descMax} onChange={e => setEditingPreset({...editingPreset, descMax: parseInt(e.target.value)})} className="bg-zinc-900/50 border-zinc-800 h-8" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-900">
                                    {presets.map((preset) => (
                                        <div 
                                            key={preset.id} 
                                            className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer"
                                            onClick={() => applyPreset(preset.id)}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-zinc-200">{preset.name}</h4>
                                                    {preset.id === currentPresetId && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">Active</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-zinc-500 truncate max-w-[300px]">{preset.systemPrompt}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPreset({...preset});
                                                    }}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/20"
                                                    title="Duplicate Preset"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newPreset = {
                                                            ...preset,
                                                            id: crypto.randomUUID(),
                                                            name: `Copy of ${preset.name}`
                                                        };
                                                        savePresetList([...presets, newPreset], currentPresetId);
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Are you sure you want to delete this preset?')) {
                                                            const newPresets = presets.filter(p => p.id !== preset.id);
                                                            savePresetList(
                                                                newPresets,
                                                                currentPresetId === preset.id ? newPresets[0]?.id : currentPresetId
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {presets.length === 0 && (
                                        <div className="p-12 text-center text-zinc-500 text-sm">
                                            No presets found. Create one to get started.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>

                        {editingPreset && (
                            <CardFooter className="border-t border-border bg-background p-4 flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingPreset(null)}
                                    className="hover:bg-zinc-900 text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={async () => {
                                        if (!editingPreset.name) return alert("Content name required");
                                        
                                        let newPresets = [...presets];
                                        let nextActivePresetId = currentPresetId;
                                        if (editingPreset.id === 'new') {
                                            const newPreset = { ...editingPreset, id: crypto.randomUUID() };
                                            newPresets.push(newPreset);
                                            if (!currentPresetId) {
                                                nextActivePresetId = newPreset.id;
                                            }
                                        } else {
                                            newPresets = newPresets.map(p => p.id === editingPreset.id ? editingPreset : p);
                                            nextActivePresetId = editingPreset.id === currentPresetId ? editingPreset.id : currentPresetId;
                                        }
                                        
                                        const savedPresets = await savePresetList(newPresets, nextActivePresetId);
                                        if (savedPresets) setEditingPreset(null);
                                    }}
                                >
                                    <Save className="h-3.5 w-3.5 mr-2" />
                                    Save Changes
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}

function getPresetSignature(presetId, preset) {
return JSON.stringify([
presetId,
preset.systemPrompt,
preset.titleMin,
preset.titleMax,
preset.descMin,
preset.descMax
]);
}

async function parseApiResponse(response) {
const parsed = await response.json().catch(() => ({}));

if (!response.ok) {
throw new Error(parsed.error || `Request failed with status ${response.status}`);
}

return parsed;
}

function readBrowserStorageSnapshot() {
const snapshot = {
presets: undefined,
draft: undefined,
hasData: false
};

try {
const rawPresets = window.localStorage.getItem("seo_presets");
if (rawPresets) {
    const parsedPresets = JSON.parse(rawPresets);
    if (Array.isArray(parsedPresets)) {
        snapshot.presets = parsedPresets;
        snapshot.hasData = true;
    }
}

const storedTitle = window.localStorage.getItem("draft_title");
const storedDescription = window.localStorage.getItem("draft_description");
if (storedTitle !== null || storedDescription !== null) {
    snapshot.draft = {
        title: storedTitle || "",
        description: storedDescription || ""
    };
    snapshot.hasData = true;
}
} catch (error) {
console.error("Failed to read browser storage for migration", error);
}

return snapshot;
}

function clearBrowserStorageSnapshot() {
try {
window.localStorage.removeItem("seo_presets");
window.localStorage.removeItem("draft_title");
window.localStorage.removeItem("draft_description");
} catch (error) {
console.error("Failed to clear migrated browser storage", error);
}
}
