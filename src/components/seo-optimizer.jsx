import React, { useState, useEffect } from "react";
import { OpenAI } from "openai";
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

// Initialize OpenAI client (same as before)
const getClient = () => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    const baseURL = "https://openrouter.ai/api/v1";
    
    if (!apiKey) return null;

    return new OpenAI({
        apiKey,
        baseURL,
        dangerouslyAllowBrowser: true 
    });
};

export default function SeoOptimizer() {
    // State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    
    // Results State
    const [optimizedTitle, setOptimizedTitle] = useState("");
    const [optimizedDescriptions, setOptimizedDescriptions] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
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

    // Load presets
    useEffect(() => {
        const stored = localStorage.getItem("seo_presets");
        if (stored) {
            try {
                setPresets(JSON.parse(stored));
            } catch (e) {
                setPresets(defaultPresets);
            }
        } else {
            setPresets(defaultPresets);
        }
    }, []);

    // Load Drafts
    useEffect(() => {
        const draftTitle = localStorage.getItem("draft_title");
        const draftDesc = localStorage.getItem("draft_description");
        if (draftTitle) setTitle(draftTitle);
        if (draftDesc) setDescription(draftDesc);
    }, []);

    // Save Drafts
    useEffect(() => {
        localStorage.setItem("draft_title", title);
    }, [title]);

    useEffect(() => {
        localStorage.setItem("draft_description", description);
    }, [description]);

    // Save Presets to LocalStorage
    useEffect(() => {
        if (presets.length > 0) {
            localStorage.setItem("seo_presets", JSON.stringify(presets));
        }
    }, [presets]);

    // Apply Preset
    const applyPreset = (id) => {
        const preset = presets.find(p => p.id === id);
        if (preset) {
            setCurrentPresetId(id);
            setSystemPrompt(preset.systemPrompt);
            setTitleMin(preset.titleMin);
            setTitleMax(preset.titleMax);
            setDescMin(preset.descMin);
            setDescMax(preset.descMax);
        }
    };

    const getLengthColor = (current, min, max) => {
        if (current === 0) return "text-zinc-600";
        if (current < min || current > max) return "text-red-400";
        return "text-emerald-500";
    };

    const optimize = async () => {
        if (!title && !description) return;
        
        setError(null);
        const client = getClient();
        if (!client) {
            setError("Missing API Key. Please check .env.local");
            return;
        }

        setLoading(true);
        setOptimizedTitle("");
        setOptimizedDescriptions([]);
        try {
            const prompt = `
            Task: Optimize the following content for SEO.
            
            Inputs:
            ${title ? `Title: "${title}"` : "Title: (Not provided)"}
            ${description ? `Description: "${description}"` : "Description: (Not provided)"}
            
            Constraints:
            - Title Length: Ideally between ${titleMin} and ${titleMax} characters.
            - Description Length: Ideally between ${descMin} and ${descMax} characters.
            - Output Format: JSON with key "title" (string) and "description_variants" (array of exactly 3 strings). 
            
            Instructions:
            - ${systemPrompt}
            - Provide 3 distinct variations for the description to account for different angles (e.g., one benefit-focused, one curiosity-focused, one keyword-focused).
            - Return ONLY valid JSON.
            `;

            const completion = await client.chat.completions.create({
                model: import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free",
                messages: [
                    { role: "system", content: "You are a helpful SEO assistant that outputs JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" } 
            });

            const content = completion.choices[0].message.content;
            const parsed = JSON.parse(content);
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
            setError("Optimization failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="flex h-screen w-full bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-emerald-500/20">
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl z-50 flex items-center justify-between px-6">
                <div 
                    className="flex items-center gap-3 cursor-pointer group" 
                    onClick={() => {
                        setOptimizedTitle("");
                        setOptimizedDescriptions([]);
                    }}
                >
                    <div className="flex items-center gap-2 group-hover:opacity-80 transition-opacity">
                        <div className="h-6 w-0.5 bg-emerald-500 rounded-full" />
                        <h1 className="text-lg tracking-[0.2em] text-zinc-100 font-light">
                            <span className="font-bold text-white">SEO</span> OPTIMIZER
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 mr-2">
                        <Label className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Active Preset</Label>
                        <Select value={currentPresetId} onValueChange={applyPreset}>
                            <SelectTrigger className="w-[180px] h-9 bg-zinc-900 border-zinc-800 text-xs font-medium text-zinc-300 focus:ring-zinc-700 focus:ring-offset-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                {presets.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs focus:bg-zinc-800 focus:text-white cursor-pointer">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-6 w-px bg-zinc-800 mx-2" />

                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-9 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 gap-2"
                        onClick={() => setShowPresetManager(true)}
                    >
                        <Settings className="h-4 w-4" />
                        Manage Presets
                    </Button>
                </div>
            </div>

            {/* Main Layout - Top Padding for Header, Bottom Padding for Footer */}
            <div className="flex w-full h-full pt-16 pb-20">
                
                {/* Left Sidebar - Input */}
                <div className="w-[420px] bg-[#0c0c0e] border-r border-white/5 flex flex-col shrink-0">
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
                        
                        <div className="space-y-8">
                             {/* Title Input */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <LayoutTemplate className="h-3.5 w-3.5 text-emerald-400" /> Title
                                    </Label>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                                        {title.length}
                                    </span>
                                </div>
                                <Textarea 
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Enter your current page title..."
                                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800/80 text-sm resize-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <TextQuote className="h-3.5 w-3.5 text-emerald-400" /> Description
                                    </Label>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                                        {description.length}
                                    </span>
                                </div>
                                <Textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Enter your current meta description..."
                                    className="min-h-[180px] bg-zinc-900/50 border-zinc-800/80 text-sm resize-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                                />
                                <div className="flex justify-end pt-2 px-1">
                                    <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/50">
                                        <Sparkles className="h-3 w-3 opacity-50" />
                                        {import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free"}
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
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Content - Results */}
                <div className="flex-1 bg-[#09090b] relative overflow-hidden flex flex-col">
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-linear-to-br from-emerald-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />

                    {loading ? null : (!optimizedTitle && optimizedDescriptions.length === 0) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 animate-in fade-in zoom-in-95 duration-500">
                            <p className="text-sm font-mono tracking-widest lowercase opacity-50">waiting for input...</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-12 max-w-6xl mx-auto w-full space-y-12">
                            {/* Title Section */}
                            <div className="space-y-5 animate-in slide-in-from-bottom-5 fade-in duration-500">
                                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <LayoutTemplate className="h-4 w-4 text-emerald-500" /> 
                                        Optimized Title Tag
                                    </h2>
                                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800", getLengthColor(optimizedTitle.length, titleMin, titleMax))}>
                                        {optimizedTitle.length} chars
                                    </span>
                                </div>
                                
                                <div className="group relative rounded-xl bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/80 p-1 hover:border-emerald-500/30 transition-all duration-300 shadow-xl shadow-black/20">
                                    <div className="relative p-6 bg-[#0c0c0e]/50 rounded-[10px]">
                                         <p className="text-2xl font-medium text-white tracking-tight">{optimizedTitle}</p>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <Button 
                                            variant="secondary" 
                                            size="icon" 
                                            className="h-8 w-8 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-emerald-600 border border-zinc-700 hover:border-emerald-500 transition-all"
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
                                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <TextQuote className="h-4 w-4 text-emerald-500" /> 
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
                                                    className="h-8 w-8 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-emerald-600 border border-zinc-700 hover:border-emerald-500"
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
            <div className="fixed bottom-0 left-0 right-0 h-20 border-t border-white/5 bg-[#09090b]/80 backdrop-blur-xl z-50 flex items-center justify-end px-8">
                <div className="flex items-center gap-4 w-full justify-end">
                    {error && (
                        <p className="text-red-400 text-xs animate-in fade-in slide-in-from-bottom-1 mr-4">{error}</p>
                    )}
                    <Button 
                        onClick={optimize} 
                        disabled={loading || (!title && !description)}
                        className="w-[240px] h-11 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 font-medium tracking-wide transition-all shadow-lg hover:shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        {loading ? (
                            <div className="flex items-center gap-2 justify-center">
                                <div className="h-4 w-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                                <span className="text-zinc-400">Optimizing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 justify-center">
                                <Wand2 className="h-4 w-4 text-emerald-500 group-hover:text-emerald-400 transition-colors" /> 
                                <span>Generate Optimization</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>

            {/* Preset Manager Overlay */}
            {showPresetManager && (
                <div className="fixed inset-0 z-100 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl flex flex-col bg-[#0c0c0e] border-zinc-800 text-zinc-100 shadow-2xl max-h-[85vh]">
                        <CardHeader className="border-b border-zinc-900 bg-[#09090b] py-4">
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
                                            <SlidersHorizontal className="h-4 w-4 text-emerald-500" />
                                            Manage Presets
                                        </>
                                    )}
                                </CardTitle>
                                {!editingPreset && (
                                    <div className="flex gap-2">
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
                                            className="h-8 text-xs bg-white text-black hover:bg-zinc-200 gap-1.5"
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
                                        <div key={preset.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-zinc-200">{preset.name}</h4>
                                                    {preset.id === currentPresetId && (
                                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Active</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-zinc-500 truncate max-w-[300px]">{preset.systemPrompt}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                                                    onClick={() => setEditingPreset({...preset})}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-950/20"
                                                    title="Duplicate Preset"
                                                    onClick={() => {
                                                        const newPreset = { 
                                                            ...preset, 
                                                            id: crypto.randomUUID(),
                                                            name: `Copy of ${preset.name}`
                                                        };
                                                        setPresets([...presets, newPreset]);
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this preset?')) {
                                                            const newPresets = presets.filter(p => p.id !== preset.id);
                                                            setPresets(newPresets);
                                                            if (currentPresetId === preset.id && newPresets.length > 0) {
                                                                setCurrentPresetId(newPresets[0].id);
                                                            }
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
                            <CardFooter className="border-t border-zinc-900 bg-[#09090b] p-4 flex justify-end gap-2">
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
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                    onClick={() => {
                                        if (!editingPreset.name) return alert("Content name required");
                                        
                                        let newPresets = [...presets];
                                        if (editingPreset.id === 'new') {
                                            const newPreset = { ...editingPreset, id: crypto.randomUUID() };
                                            newPresets.push(newPreset);
                                        } else {
                                            newPresets = newPresets.map(p => p.id === editingPreset.id ? editingPreset : p);
                                        }
                                        
                                        setPresets(newPresets);
                                        setEditingPreset(null);
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
