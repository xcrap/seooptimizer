import React, { useState, useEffect } from "react";
import { OpenAI } from "openai";
import { Copy, Plus, Save, Settings, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import defaultPresets from "@/presets.json";

// Initialize OpenAI client
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
    const [optimizedTitle, setOptimizedTitle] = useState("");
    const [optimizedDescription, setOptimizedDescription] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Settings State
    const [systemPrompt, setSystemPrompt] = useState(defaultPresets[0].systemPrompt);
    const [titleMin, setTitleMin] = useState(defaultPresets[0].titleMin);
    const [titleMax, setTitleMax] = useState(defaultPresets[0].titleMax);
    const [descMin, setDescMin] = useState(defaultPresets[0].descMin);
    const [descMax, setDescMax] = useState(defaultPresets[0].descMax);

    // Presets Management
    const [presets, setPresets] = useState([]);
    const [currentPresetId, setCurrentPresetId] = useState(defaultPresets[0].id);
    const [showJsonEditor, setShowJsonEditor] = useState(false);
    const [jsonContent, setJsonContent] = useState("");

    // Initialize/Load Presets
    useEffect(() => {
        const stored = localStorage.getItem("seo_presets");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPresets(parsed);
            } catch (e) {
                console.error("Failed to parse presets", e);
                setPresets(defaultPresets);
            }
        } else {
            setPresets(defaultPresets);
        }
    }, []);

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

    const handleSaveAsPreset = () => {
        const name = prompt("Enter a name for this preset:");
        if (!name) return;
        
        const newPreset = {
            id: Date.now().toString(),
            name,
            systemPrompt,
            titleMin,
            titleMax,
            descMin,
            descMax
        };
        
        const newPresets = [...presets, newPreset];
        setPresets(newPresets);
        setCurrentPresetId(newPreset.id);
    };

    const getLengthColor = (current, min, max) => {
        if (current === 0) return "text-muted-foreground";
        if (current < min || current > max) return "text-destructive";
        return "text-green-500";
    };

    const optimize = async () => {
        if (!title && !description) return;
        
        const client = getClient();
        if (!client) {
            alert("Please set VITE_OPENROUTER_API_KEY in .env.local");
            return;
        }

        setLoading(true);
        try {
            const prompt = `
            Task: Optimize the following content for SEO.
            
            Inputs:
            ${title ? `Title: "${title}"` : "Title: (Not provided)"}
            ${description ? `Description: "${description}"` : "Description: (Not provided)"}
            
            Constraints:
            - Title Length: Ideally between ${titleMin} and ${titleMax} characters.
            - Description Length: Ideally between ${descMin} and ${descMax} characters.
            - Output Format: JSON with keys "title" and "description". 
            
            Instructions:
            - ${systemPrompt}
            - If a field is missing, try to generate it based on the other field if context allows. Otherwise return empty string for that field.
            - Return ONLY valid JSON.
            `;

            const completion = await client.chat.completions.create({
                model: import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free", // Default to a free model if not set
                messages: [
                    { role: "system", content: "You are a helpful SEO assistant that outputs JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" } 
            });

            const content = completion.choices[0].message.content;
            try {
                const parsed = JSON.parse(content);
                setOptimizedTitle(parsed.title || "");
                setOptimizedDescription(parsed.description || "");
            } catch (e) {
                console.error("Failed to parse JSON response", content);
                // Fallback if model didn't return JSON
                setOptimizedTitle(content); // Rough fallback
            }

        } catch (error) {
            console.error("Optimization failed", error);
            alert("Optimization failed. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">SEO Optimizer</h1>
                        <p className="text-muted-foreground mt-1">Craft perfect titles and descriptions with AI.</p>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Select value={currentPresetId} onValueChange={applyPreset}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Preset" />
                            </SelectTrigger>
                            <SelectContent>
                                {presets.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => {
                            setJsonContent(JSON.stringify(presets, null, 2));
                            setShowJsonEditor(true);
                        }} title="Manage Presets JSON">
                            <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleSaveAsPreset} title="Save current as new preset">
                            <Save className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Input Column */}
                    <div className="space-y-6">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Input</CardTitle>
                                <CardDescription>Enter your current content and settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="title">Title</Label>
                                        <span className={cn("text-xs font-mono", getLengthColor(title.length, titleMin, titleMax))}>
                                            {title.length} / {titleMax}
                                        </span>
                                    </div>
                                    <Input 
                                        id="title" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        placeholder="Enter page title..." 
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="desc">Description</Label>
                                        <span className={cn("text-xs font-mono", getLengthColor(description.length, descMin, descMax))}>
                                            {description.length} / {descMax}
                                        </span>
                                    </div>
                                    <Textarea 
                                        id="desc" 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        placeholder="Enter meta description..." 
                                        className="h-32"
                                    />
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Configuration</Label>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="systemPrompt" className="text-xs">System Prompt</Label>
                                            <Textarea 
                                                id="systemPrompt" 
                                                value={systemPrompt} 
                                                onChange={e => setSystemPrompt(e.target.value)}
                                                className="text-xs font-mono bg-muted/50 min-h-[80px]"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Title Length (Min/Max)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" value={titleMin} onChange={e => setTitleMin(Number(e.target.value))} className="h-8 text-xs" />
                                                    <span className="text-muted-foreground">-</span>
                                                    <Input type="number" value={titleMax} onChange={e => setTitleMax(Number(e.target.value))} className="h-8 text-xs" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Desc Length (Min/Max)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" value={descMin} onChange={e => setDescMin(Number(e.target.value))} className="h-8 text-xs" />
                                                    <span className="text-muted-foreground">-</span>
                                                    <Input type="number" value={descMax} onChange={e => setDescMax(Number(e.target.value))} className="h-8 text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={optimize} disabled={loading} className="w-full bg-white text-black hover:bg-gray-200">
                                    {loading ? (
                                        <>Generating...</>
                                    ) : (
                                        <>
                                            <Wand2 className="mr-2 h-4 w-4" /> Optimize
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Output Column */}
                    <div className="space-y-6">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
                            <CardHeader>
                                <CardTitle>Optimized Result</CardTitle>
                                <CardDescription>AI generated suggestions.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-green-500">Optimized Title</Label>
                                        <div className="flex items-center gap-2">
                                             <span className={cn("text-xs font-mono", getLengthColor(optimizedTitle.length, titleMin, titleMax))}>
                                                {optimizedTitle.length}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(optimizedTitle)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-md bg-muted/30 border border-border min-h-[42px] text-sm break-words">
                                        {optimizedTitle || <span className="text-muted-foreground/50 italic">Waiting for generation...</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-green-500">Optimized Description</Label>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-mono", getLengthColor(optimizedDescription.length, descMin, descMax))}>
                                                {optimizedDescription.length}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(optimizedDescription)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-md bg-muted/30 border border-border min-h-[100px] text-sm whitespace-pre-wrap break-words">
                                        {optimizedDescription || <span className="text-muted-foreground/50 italic">Waiting for generation...</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* JSON Editor Dialog Overlay (Simple implementation) */}
            {showJsonEditor && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
                        <CardHeader>
                            <CardTitle>Manage Presets JSON</CardTitle>
                            <CardDescription>Edit the raw JSON of your presets. Be careful with syntax.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <Textarea 
                                value={jsonContent} 
                                onChange={e => setJsonContent(e.target.value)} 
                                className="font-mono text-xs h-full resize-none"
                            />
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowJsonEditor(false)}>Cancel</Button>
                            <Button onClick={() => {
                                try {
                                    const parsed = JSON.parse(jsonContent);
                                    if (Array.isArray(parsed)) {
                                        setPresets(parsed);
                                        setShowJsonEditor(false);
                                    } else {
                                        alert("Presets must be an array.");
                                    }
                                } catch (e) {
                                    alert("Invalid JSON");
                                }
                            }}>Save Changes</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
