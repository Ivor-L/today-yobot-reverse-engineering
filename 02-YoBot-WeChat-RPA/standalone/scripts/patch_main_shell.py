"""Apply the recovered product-shell customizations to the compiled renderer.

The original TypeScript source is unavailable.  Keep the small, exact-string
patches here so every standalone build can verify and reproduce the shell:
NexSale wordmark, a compact primary navigation, a second-level settings hub,
and no invitation/notice UI or FireFlow navigation item.
"""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "app/dist/ui/assets/index-y6HZ4z8k.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count == 1:
        return source.replace(old, new, 1)
    if count == 0 and new in source:
        return source
    raise RuntimeError(f"{label}: expected one original occurrence, found {count}")


def replace_range_once(
    source: str, start_token: str, end_token: str, replacement: str, label: str
) -> str:
    """Replace a unique half-open renderer range, preserving end_token."""
    if replacement in source and start_token not in source:
        return source
    start_count = source.count(start_token)
    if start_count != 1:
        raise RuntimeError(f"{label}: expected one start token, found {start_count}")
    start = source.index(start_token)
    end = source.find(end_token, start)
    if end < 0:
        raise RuntimeError(f"{label}: end token not found")
    return source[:start] + replacement + source[end:]


def main() -> None:
    source = BUNDLE.read_text()

    source = replace_once(
        source,
        'branding:{title:"YoBot",botName:"YoBot"',
        'branding:{title:"NexSale",botName:"NexSale"',
        "brand name",
    )

    # Let macOS own the window chrome.  The renderer keeps a single compact
    # draggable title row and moves the chat title/actions into that row.
    source = replace_once(
        source,
        'className:"absolute top-0 left-0 w-full h-8 z-50 flex justify-end",style:{WebkitAppRegion:"drag"},children:s.jsx(rj,{})',
        'className:"nexsale-login-titlebar absolute top-0 left-0 w-full h-8 z-50",style:{WebkitAppRegion:"drag"}',
        "login native titlebar",
    )
    source = replace_once(
        source,
        'className:"h-16 flex items-center justify-end pl-4 pr-0 select-none bg-content transition-colors duration-200",style:{WebkitAppRegion:"drag"},children:s.jsxs("div",{className:"flex items-center h-full gap-2",style:{WebkitAppRegion:"no-drag"},children:[s.jsxs("div",{className:"mr-2 flex items-center gap-2",children:[t&&s.jsx(Z$,{updateInfo:e??null,onClick:t}),s.jsx(_$,{})]}),s.jsx(rj,{})]})',
        'className:"nexsale-native-titlebar h-16 flex items-center justify-end pl-4 pr-0 select-none bg-content transition-colors duration-200",style:{WebkitAppRegion:"drag"},children:s.jsx("div",{className:"nexsale-titlebar-global-actions flex items-center h-full gap-2",style:{WebkitAppRegion:"no-drag"},children:s.jsxs("div",{className:"mr-2 flex items-center gap-2",children:[t&&s.jsx(Z$,{updateInfo:e??null,onClick:t}),s.jsx(_$,{})]})})',
        "main native titlebar",
    )
    source = replace_once(
        source,
        'className:"h-screen w-full flex bg-app text-primary overflow-hidden transition-colors duration-200"',
        'className:"nexsale-app-shell h-screen w-full flex bg-app text-primary overflow-hidden transition-colors duration-200"',
        "application shell hook",
    )
    source = replace_once(
        source,
        'className:"flex-1 flex flex-col overflow-hidden",children:[s.jsx(r8,',
        'className:"nexsale-main-column flex-1 flex flex-col overflow-hidden",children:[s.jsx(r8,',
        "main column hook",
    )
    source = replace_once(
        source,
        'className:_e("bg-sidebar border-r border-border dark:border-transparent flex flex-col h-full transition-all duration-300 ease-in-out",f?"w-16":"w-64")',
        'className:_e("nexsale-sidebar bg-sidebar border-r border-border dark:border-transparent flex flex-col h-full transition-all duration-300 ease-in-out",f?"w-16":"w-64")',
        "sidebar shell hook",
    )
    source = replace_once(
        source,
        'className:_e("h-16 flex items-center px-4 shrink-0 transition-all duration-300",f?"justify-center":"justify-between")',
        'className:_e("nexsale-sidebar-titlebar h-16 flex items-center px-4 shrink-0 transition-all duration-300",f?"justify-center":"justify-between")',
        "sidebar titlebar hook",
    )

    source = replace_once(
        source,
        'className:"h-14 border-b border-border flex items-center justify-between gap-4 px-4 bg-content z-10 transition-colors duration-200",children:[s.jsxs("div",{className:"flex min-w-0 items-center gap-3 overflow-hidden"',
        'className:"nexsale-chat-header h-14 border-b border-border flex items-center justify-between gap-4 px-4 bg-content z-10 transition-colors duration-200",children:[s.jsxs("div",{className:"nexsale-chat-titlebar-title flex min-w-0 items-center gap-3 overflow-hidden"',
        "chat header and title hook",
    )
    source = replace_once(
        source,
        's.jsxs("div",{className:"flex items-center gap-2 relative",children:[s.jsx(PY,{experts:Y',
        's.jsxs("div",{className:"nexsale-chat-header-actions flex items-center gap-2 relative",style:{WebkitAppRegion:"no-drag"},children:[s.jsx(PY,{experts:Y',
        "chat header actions hook",
    )

    expanded_brand = (
        's.jsxs("div",{className:"flex items-center gap-3 select-none overflow-hidden",children:['
        's.jsx("img",{src:Bi,alt:"Logo",className:"w-8 h-8 rounded-lg shrink-0"}),' 
        's.jsxs("div",{className:"flex flex-col min-w-0",children:['
        's.jsx("span",{className:"font-bold text-lg leading-none text-primary truncate",children:De.branding.title}),' 
        's.jsx("span",{className:"text-xs leading-none text-secondary mt-1 truncate",children:"私域AI助理"})]})]})'
    )
    expanded_wordmark = (
        's.jsx("div",{className:"select-none overflow-hidden",children:'
        's.jsx("span",{className:"font-semibold text-lg leading-none text-primary truncate",children:De.branding.title})})'
    )
    source = replace_once(source, expanded_brand, expanded_wordmark, "expanded wordmark")

    collapsed_brand = (
        's.jsxs("div",{className:"relative w-8 h-8 flex items-center justify-center",children:['
        's.jsx("img",{src:Bi,alt:"Logo",className:"w-8 h-8 rounded-lg absolute transition-opacity duration-200 group-hover:opacity-0"}),' 
        's.jsx(z3,{className:"w-6 h-6 text-primary absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"})]})'
    )
    collapsed_wordmark = (
        's.jsx("div",{className:"flex h-8 w-8 items-center justify-center text-sm font-semibold text-primary",children:"N"})'
    )
    source = replace_once(source, collapsed_brand, collapsed_wordmark, "collapsed wordmark")

    account_brand = (
        's.jsxs("div",{className:"h-16 flex items-center gap-3 px-6 border-b border-gray-100 dark:border-gray-800",children:['
        's.jsx("img",{src:Bi,alt:"Logo",className:"w-6 h-6 rounded-lg"}),' 
        's.jsx("span",{className:"font-bold text-gray-900 dark:text-white",children:De.branding.title})]})'
    )
    account_wordmark = (
        's.jsx("div",{className:"h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800",children:'
        's.jsx("span",{className:"font-semibold text-gray-900 dark:text-white",children:De.branding.title})})'
    )
    source = replace_once(source, account_brand, account_wordmark, "account wordmark")

    # Use lighter navigation typography and Lucide strokes throughout the
    # compact primary rail.
    source = replace_once(
        source,
        '"relative flex gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium"',
        '"relative flex gap-3 px-3 py-2.5 rounded-lg border border-transparent transition-colors text-[15px] font-normal leading-5"',
        "navigation typography",
    )
    source = replace_once(
        source,
        's.jsx(t,{className:"w-5 h-5 shrink-0"})',
        's.jsx(t,{className:"w-[18px] h-[18px] shrink-0",strokeWidth:1.55})',
        "navigation icon weight",
    )

    # Remove the standalone FireFlow item from the first sidebar group while
    # retaining the workflow skills that agents may still use internally.
    fireflow_label = 'children:"FireFlow"'
    if fireflow_label in source:
        label_at = source.index(fireflow_label)
        start = source.rfind(',s.jsxs("div",{onClick:', 0, label_at)
        end_token = 'children:"FireFlow"})]})'
        end = source.find(end_token, label_at)
        if start < 0 or end < 0:
            raise RuntimeError("FireFlow navigation: component boundary not found")
        source = source[:start] + source[end + len(end_token):]
    elif 'label:"FireFlow"' in source:
        raise RuntimeError("FireFlow navigation: unexpected renderer shape")

    # The header invitations and notification center are not mounted.  The
    # latter also removes the user's route to official announcements.
    source = replace_once(
        source,
        's.jsx(n8,{}),s.jsx(X$,{}),',
        '',
        "header invitation and notices",
    )

    # Suppress the global official-announcement popup as well as its header
    # entry.  Login-expiry and operational alerts remain intact.
    source = replace_once(
        source,
        'j.length>0&&s.jsx(cj,{queue:j,onDismiss:tn}),',
        '',
        "automatic official announcement",
    )

    # Give the chat composer stable hooks for the recovered flat theme.  The
    # renderer otherwise gives every textarea the global high-contrast focus
    # ring, which creates a dark box inside the composer.
    source = replace_once(
        source,
        'className:`max-w-4xl mx-auto relative bg-card border transition-all flex flex-col ${p?',
        'className:`nexsale-chat-composer ${A?"nexsale-chat-composer-compact":""} max-w-4xl mx-auto relative bg-card border transition-all flex flex-col ${p?',
        "chat composer hook",
    )
    source = replace_once(
        source,
        'className:"w-full bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 resize-none max-h-[200px] py-2 text-primary placeholder-gray-400 leading-relaxed"',
        'className:"nexsale-chat-input w-full bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 resize-none max-h-[200px] py-2 text-primary placeholder-gray-400 leading-relaxed"',
        "chat input hook",
    )
    if "nexsale-chat-send" not in source:
        source = replace_once(
            source,
            'className:"p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"',
            'className:"nexsale-chat-send p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"',
            "chat send hook",
        )

    # On a new, empty conversation the same composer is presented as a
    # compact single row between the greeting and the shortcut prompts.
    source = replace_once(
        source,
        'officialExpertExitDisabled:y=!1})=>{',
        'officialExpertExitDisabled:y=!1,compactInitial:A=!1})=>{',
        "compact composer property",
    )
    source = replace_once(
        source,
        'className:`px-4 pb-4 w-full ${p?"pt-0":"pt-4"}`',
        'className:`nexsale-chat-composer-wrap px-4 pb-4 w-full ${p?"pt-0":"pt-4"} ${A?"nexsale-chat-composer-wrap-compact":""}`',
        "composer wrapper state",
    )
    source = replace_once(
        source,
        'className:`nexsale-chat-composer max-w-4xl mx-auto relative bg-card border transition-all flex flex-col ${p?',
        'className:`nexsale-chat-composer ${A?"nexsale-chat-composer-compact":""} max-w-4xl mx-auto relative bg-card border transition-all flex flex-col ${p?',
        "compact composer class",
    )
    source = replace_once(
        source,
        's.jsx("div",{className:`px-4 pb-1 ${f?"pt-1.5":"pt-3"}`,children:s.jsx("textarea"',
        's.jsx("div",{className:`nexsale-chat-input-row px-4 pb-1 ${f?"pt-1.5":"pt-3"}`,children:s.jsx("textarea"',
        "composer input row",
    )
    source = replace_once(
        source,
        'i.length>0&&s.jsx("div",{className:"flex gap-2 p-3 pb-0 overflow-x-auto"',
        'i.length>0&&s.jsx("div",{className:"nexsale-chat-attachments flex gap-2 p-3 pb-0 overflow-x-auto"',
        "composer attachment row",
    )
    source = replace_once(
        source,
        's.jsxs("div",{className:"flex items-center justify-between px-3 pb-3 pt-1",children:[s.jsxs("div",{className:"flex items-center gap-1",children:[',
        's.jsxs("div",{className:"nexsale-chat-toolbar flex items-center justify-between px-3 pb-3 pt-1",children:[s.jsxs("div",{className:"nexsale-chat-tools flex items-center gap-1",children:[',
        "composer toolbar hooks",
    )
    if 'className:"nexsale-chat-actions flex items-center gap-3"' not in source:
        source = replace_once(
            source,
            's.jsxs("div",{className:"flex items-center gap-3",children:[s.jsx(TY,{})',
            's.jsxs("div",{className:"nexsale-chat-actions flex items-center gap-3",children:[s.jsx(TY,{})',
            "composer actions hook",
        )
    source = replace_once(
        source,
        'className:"nexsale-chat-actions flex items-center gap-3",children:[s.jsx(TY,{}),',
        'className:"nexsale-chat-actions flex items-center gap-3",children:[',
        "remove composer model selector",
    )
    # During generation the primary send control becomes the pause/stop
    # control.  Keeping both controls created two competing primary actions
    # and left a small, low-contrast stop button beside the send button.
    # Upgrade the first merged-control build from the outline paper plane to
    # the final solid arrow glyph before applying the pristine-bundle patch.
    if 's.jsx("button",{type:"button",onClick:d?c:C,disabled:d?!c:r||!e.trim()&&i.length===0,className:`nexsale-chat-send ${d?"nexsale-chat-stop":""} p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700`,title:d?"暂停当前任务":"发送","aria-label":d?"暂停当前任务":"发送",children:d?s.jsx("span",{className:"nexsale-chat-stop-icon"}):s.jsx(Mp,{className:"w-4 h-4"})})' in source:
        source = source.replace('s.jsx("button",{type:"button",onClick:d?c:C,disabled:d?!c:r||!e.trim()&&i.length===0,className:`nexsale-chat-send ${d?"nexsale-chat-stop":""} p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700`,title:d?"暂停当前任务":"发送","aria-label":d?"暂停当前任务":"发送",children:d?s.jsx("span",{className:"nexsale-chat-stop-icon"}):s.jsx(Mp,{className:"w-4 h-4"})})', 's.jsx("button",{type:"button",onClick:d?c:C,disabled:d?!c:r||!e.trim()&&i.length===0,className:`nexsale-chat-send ${d?"nexsale-chat-stop":""} p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700`,title:d?"暂停当前任务":"发送","aria-label":d?"暂停当前任务":"发送",children:d?s.jsx("span",{className:"nexsale-chat-stop-icon"}):s.jsx("span",{className:"nexsale-chat-send-icon"})})', 1)
    source = replace_once(
        source,
        'd&&s.jsx("button",{type:"button",onClick:c,className:"group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-red-500/20 bg-red-500/[0.06] text-red-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:border-red-500/35 hover:bg-red-500/[0.11] hover:text-red-600 hover:shadow-[0_3px_10px_rgba(239,68,68,0.10)] active:scale-[0.94] active:bg-red-500/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:border-red-400/20 dark:bg-red-400/[0.08] dark:text-red-400 dark:hover:border-red-400/35 dark:hover:bg-red-400/[0.13] dark:hover:text-red-300",title:"停止当前任务","aria-label":"停止当前任务",children:s.jsx("span",{className:"h-2.5 w-2.5 rounded-[2.5px] bg-current transition-transform duration-200 group-hover:scale-90"})}),s.jsx("button",{onClick:C,disabled:r||!e.trim()&&i.length===0,className:"nexsale-chat-send p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700",title:d?"加入等待队列":"发送",children:s.jsx(Mp,{className:"w-4 h-4"})})',
        's.jsx("button",{type:"button",onClick:d?c:C,disabled:d?!c:r||!e.trim()&&i.length===0,className:`nexsale-chat-send ${d?"nexsale-chat-stop":""} p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700`,title:d?"暂停当前任务":"发送","aria-label":d?"暂停当前任务":"发送",children:d?s.jsx("span",{className:"nexsale-chat-stop-icon"}):s.jsx("span",{className:"nexsale-chat-send-icon"})})',
        "merge running stop and send controls",
    )

    # Stable hooks for the question panel.  The original violet gradients are
    # intentionally removed by the monochrome theme, so explicit hooks are
    # needed to preserve contrast for the selected check and submit action.
    source = replace_once(
        source,
        'className:`flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/35 disabled:cursor-not-allowed disabled:opacity-50 ${D?',
        'className:`nexsale-interaction-option flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/35 disabled:cursor-not-allowed disabled:opacity-50 ${D?',
        "interaction option hook",
    )
    source = replace_once(
        source,
        'className:`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-medium transition-colors ${D?',
        'className:`nexsale-interaction-choice grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-medium transition-colors ${D?',
        "interaction selected icon hook",
    )
    source = replace_once(
        source,
        'className:"ml-auto grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#6f63c9] to-[#8a5fa8] text-white shadow-[0_6px_18px_rgba(111,99,201,0.3)] transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_22px_rgba(111,99,201,0.36)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:text-white disabled:shadow-none disabled:opacity-35 dark:disabled:from-gray-600 dark:disabled:to-gray-600"',
        'className:"nexsale-interaction-submit ml-auto grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#6f63c9] to-[#8a5fa8] text-white shadow-[0_6px_18px_rgba(111,99,201,0.3)] transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_22px_rgba(111,99,201,0.36)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:text-white disabled:shadow-none disabled:opacity-35 dark:disabled:from-gray-600 dark:disabled:to-gray-600"',
        "interaction submit hook",
    )

    # Keep the execution trace collapsed by default.  Its single-line summary
    # is derived from the most recent thought or tool event, so streaming
    # updates replace the text in place while the full trace remains available
    # on click.
    source = replace_once(
        source,
        'defaultExpanded:n=!0,hideHeader:r=!1',
        'defaultExpanded:n=!1,hideHeader:r=!1',
        "collapse thinking trace by default",
    )
    source = replace_once(
        source,
        'const[i,l]=k.useState(n),c=It.useMemo(',
        'const[i,l]=k.useState(n),[a,o]=k.useState(()=>Date.now());k.useEffect(()=>{if(t)return;const p=window.setInterval(()=>o(Date.now()),1e3);return()=>window.clearInterval(p)},[t]);const c=It.useMemo(',
        "thinking elapsed timer",
    )
    if "elapsedSeconds:Math.max" not in source:
        source = replace_once(
            source,
            'g.type==="message"&&g.role==="thought"&&(p++,h="Thinking..."),g.type==="tool"&&(f++,h=Qo(g.name,g.args),(g.status==="success"||g.status==="failed")&&(h=Qo(g.name,g.args)))',
            'g.type==="message"&&g.role==="thought"&&(p++,h=(g.content||"").replace(/\\s+/g," ").replace(/^Thinking\\.\\.\\.\\s*/,"").trim()||"正在思考"),g.type==="tool"&&(f++,h=Qo(g.name,g.args),(g.status==="success"||g.status==="failed")&&(h=Qo(g.name,g.args)))',
            "latest thinking activity",
        )
        source = replace_once(
            source,
            'd=It.useMemo(()=>{let p=0,f=0,h="";return c.forEach(g=>{g.type==="message"&&g.role==="thought"&&(p++,h=(g.content||"").replace(/\\s+/g," ").replace(/^Thinking\\.\\.\\.\\s*/,"").trim()||"正在思考"),g.type==="tool"&&(f++,h=Qo(g.name,g.args),(g.status==="success"||g.status==="failed")&&(h=Qo(g.name,g.args)))}),{thoughtCount:p,toolCallCount:f,lastActivity:h,totalSteps:c.length}},[c])',
            'd=It.useMemo(()=>{let p=0,f=0,h="",g=a,b=a;return c.forEach((y,w)=>{const E=typeof y.timestamp==="number"?y.timestamp:new Date(y.timestamp||a).getTime();Number.isFinite(E)&&(w===0&&(g=E),b=E),y.type==="message"&&y.role==="thought"&&(p++,h=(y.content||"").replace(/\\s+/g," ").replace(/^Thinking\\.\\.\\.\\s*/,"").trim()||"正在思考"),y.type==="tool"&&(f++,h=Qo(y.name,y.args),(y.status==="success"||y.status==="failed")&&(h=Qo(y.name,y.args)))}),{thoughtCount:p,toolCallCount:f,lastActivity:h,totalSteps:c.length,elapsedSeconds:Math.max(0,Math.floor(((t?b:a)-g)/1e3))}},[c,t,a])',
            "thinking elapsed duration",
        )
    source = replace_once(
        source,
        'className:"flex items-center gap-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity select-none w-auto"',
        'className:"nexsale-thinking-summary flex items-center gap-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity select-none w-auto"',
        "thinking summary hook",
    )
    if 'className:"nexsale-thinking-meta"' not in source:
        source = replace_once(
            source,
            's.jsx("span",{children:t?"已完成思考":"思考过程"}),s.jsxs("span",{className:"text-gray-400 dark:text-gray-500 font-normal",children:["(",d.totalSteps," steps",d.lastActivity?` · ${d.lastActivity}`:"",")"]})',
            's.jsx("span",{className:"nexsale-thinking-state",children:t?"已完成":"正在执行"}),s.jsx("span",{className:"nexsale-thinking-activity text-gray-400 dark:text-gray-500 font-normal",title:d.lastActivity||void 0,children:d.lastActivity||"准备中…"})',
            "single line thinking status",
        )
        source = replace_once(
            source,
            's.jsx("div",{className:"flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30",children:s.jsx(tl,{className:"w-3 h-3 text-purple-600 dark:text-purple-400"})}),s.jsxs("div",{className:"flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400",children:[s.jsx("span",{className:"nexsale-thinking-state",children:t?"已完成":"正在执行"}),s.jsx("span",{className:"nexsale-thinking-activity text-gray-400 dark:text-gray-500 font-normal",title:d.lastActivity||void 0,children:d.lastActivity||"准备中…"}),i?s.jsx(Tr,{className:"w-3.5 h-3.5 ml-0.5"}):s.jsx(Xn,{className:"w-3.5 h-3.5 ml-0.5"})]})',
            's.jsxs("div",{className:"nexsale-thinking-meta",children:[!t&&s.jsx("span",{className:"nexsale-thinking-spinner","aria-hidden":"true"}),s.jsxs("span",{className:"nexsale-thinking-elapsed",children:["已处理 ",d.elapsedSeconds," 秒"]}),i?s.jsx(Tr,{className:"w-3.5 h-3.5"}):s.jsx(Xn,{className:"w-3.5 h-3.5"})]}),s.jsxs("div",{className:"nexsale-thinking-current",children:[s.jsx("div",{className:"nexsale-thinking-current-icon",children:s.jsx(tl,{className:"w-3.5 h-3.5"})}),s.jsx("span",{className:"nexsale-thinking-activity text-gray-400 dark:text-gray-500 font-normal",title:d.lastActivity||void 0,children:d.lastActivity||"准备中…"})]})',
            "two row thinking status",
        )
    source = replace_once(
        source,
        's.jsx("div",{className:"text-center mt-2",children:s.jsxs("span"',
        's.jsx("div",{className:"nexsale-chat-disclaimer text-center mt-2",children:s.jsxs("span"',
        "composer disclaimer hook",
    )

    composer = (
        's.jsx(RY,{value:I,onChange:L,onSend:ht,disabled:!y||R===n,isGenerating:An,'
        'queueAttached:!!(Ae!=null&&Ae.pending.length||Ae!=null&&Ae.paused),onStop:tn,'
        'attachments:O,onAttachmentsChange:H,selectedSkill:C,onSelectedSkillChange:V,'
        'selectedOfficialExpert:Ge,onExitOfficialExpert:()=>ue(null),'
        'officialExpertExitDisabled:Vt||R===n||!y})'
    )
    compact_composer = composer[:-2] + ',compactInitial:!0})'
    full_composer_guard = ':Ce.length===0?null:'
    while full_composer_guard + 'Ce.length===0?null:' in source:
        source = source.replace(
            full_composer_guard + 'Ce.length===0?null:',
            full_composer_guard,
            1,
        )
    if full_composer_guard + composer not in source:
        source = replace_once(
            source,
            ':' + composer,
            full_composer_guard + composer,
            "hide full composer on empty chat",
        )
    if 'compactInitial:!0})' not in source:
        source = replace_once(
            source,
            's.jsx("p",{className:"text-xl text-black dark:text-white font-light tracking-wide",children:Ge?"告诉我你的目标、现状和已有素材":"需要我为你做什么？"})]}),!Ge&&',
            's.jsx("p",{className:"text-xl text-black dark:text-white font-light tracking-wide",children:Ge?"告诉我你的目标、现状和已有素材":"需要我为你做什么？"})]}),!ot&&'
            + compact_composer
            + ',!Ge&&',
            "place compact composer before shortcuts",
        )
    source = replace_once(
        source,
        's.jsx("h2",{className:"pb-2 text-4xl font-bold tracking-tight text-black dark:text-white",children:Ge?s.jsxs(s.Fragment,{children:[s.jsx("span",{className:"text-emerald-700 dark:text-emerald-300",children:Ge.display.name}),s.jsx("span",{children:"已就绪"})]}):`${me}！`}),s.jsx("p",{className:"text-xl text-black dark:text-white font-light tracking-wide",children:Ge?"告诉我你的目标、现状和已有素材":"需要我为你做什么？"})',
        'Ge&&s.jsx("h2",{className:"pb-2 text-4xl font-bold tracking-tight text-black dark:text-white",children:s.jsxs(s.Fragment,{children:[s.jsx("span",{className:"text-emerald-700 dark:text-emerald-300",children:Ge.display.name}),s.jsx("span",{children:"已就绪"})]})}),s.jsx("p",{className:Ge?"text-xl text-black dark:text-white font-light tracking-wide":"nexsale-empty-prompt text-3xl font-normal tracking-tight text-primary",children:Ge?"告诉我你的目标、现状和已有素材":"我们先从哪里开始呢？"})',
        "simplify empty chat greeting",
    )
    if '${Ge?"mb-0":"mb-10"}' not in source:
        spacing_candidates = ('${Ge?"mb-0":"mb-12"}', '${Ge?"mb-0":"mb-6"}')
        for spacing_old in spacing_candidates:
            if spacing_old in source:
                source = source.replace(
                    spacing_old, '${Ge?"mb-0":"mb-10"}', 1
                )
                break
        else:
            raise RuntimeError("empty chat spacing: renderer token not found")

    source = replace_once(
        source,
        'title:"创建业务SKILL",emoji:"🚀",prompt:"使用skill-creator帮我创建一个新技能，「请替换成你的详细技能描述，如：一个具体的销售SOP流程」"',
        'title:"最近我和谁互动最多",emoji:"🚀",prompt:"请基于微信好友与聊天互动记录，分析最近我和谁互动最多，并按互动次数排序。"',
        "recent interaction shortcut",
    )
    # The desired expression contains the original expression as a prefix,
    # so the generic exact replacement cannot detect this case as already
    # patched.  Normalize any earlier repeated suffixes to one slice.
    shortcut_filter = 'z_=GY.filter(e=>!e.officialOnly||$Y)'
    while shortcut_filter + '.slice(0,3).slice(0,3)' in source:
        source = source.replace(
            shortcut_filter + '.slice(0,3).slice(0,3)',
            shortcut_filter + '.slice(0,3)',
            1,
        )
    if shortcut_filter + '.slice(0,3)' not in source:
        source = replace_once(
            source,
            shortcut_filter,
            shortcut_filter + '.slice(0,3)',
            "limit empty chat shortcuts",
        )

    source = replace_once(
        source,
        '!Ge&&s.jsxs("div",{className:"flex flex-col items-center gap-4 w-full max-w-4xl px-4"',
        '!Ge&&s.jsxs("div",{className:"nexsale-quick-actions flex flex-col items-center gap-4 w-full max-w-4xl px-4"',
        "quick actions hook",
    )
    quick_row_old = 'className:"flex flex-wrap justify-center gap-4 w-full",children:z_.'
    quick_row_new = 'className:"nexsale-quick-row flex flex-wrap justify-center gap-4 w-full",children:z_.'
    if source.count(quick_row_old) == 2:
        source = source.replace(quick_row_old, quick_row_new)
    elif source.count(quick_row_new) != 2:
        raise RuntimeError("quick action rows: expected two renderer rows")

    quick_button_old = 'className:"group flex items-center gap-3 px-5 py-3 rounded-full border border-gray-200/90 dark:border-gray-700/60 bg-gray-100/85 dark:bg-gray-800/65 hover:bg-gray-200/80 dark:hover:bg-gray-700/70 hover:border-gray-300/80 dark:hover:border-gray-600/70 active:bg-gray-200 dark:active:bg-gray-700/80 shadow-[0_6px_18px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_22px_rgba(0,0,0,0.28)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-[0_10px_26px_rgba(0,0,0,0.36)] transition-all duration-200"'
    quick_button_new = 'className:"nexsale-quick-action group flex items-center gap-3 px-5 py-3 rounded-full border border-gray-200/90 dark:border-gray-700/60 bg-gray-100/85 dark:bg-gray-800/65 hover:bg-gray-200/80 dark:hover:bg-gray-700/70 hover:border-gray-300/80 dark:hover:border-gray-600/70 active:bg-gray-200 dark:active:bg-gray-700/80 shadow-[0_6px_18px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_22px_rgba(0,0,0,0.28)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-[0_10px_26px_rgba(0,0,0,0.36)] transition-all duration-200"'
    if source.count(quick_button_old) == 2:
        source = source.replace(quick_button_old, quick_button_new)
    elif source.count(quick_button_new) != 2:
        raise RuntimeError("quick action buttons: expected two renderer templates")

    quick_icon_old = 'yt.has(be.title)&&s.jsx("span",{className:"text-xl",children:be.emoji})'
    quick_icon_new = 's.jsx("span",{className:"nexsale-quick-icon text-lg",children:be.emoji})'
    if source.count(quick_icon_old) == 2:
        source = source.replace(quick_icon_old, quick_icon_new)
    elif not (
        source.count(quick_icon_new) == 1
        and source.count('className:"nexsale-quick-icon nexsale-quick-linear-icon"') == 1
    ) and source.count(quick_icon_new) != 2:
        raise RuntimeError("quick action icons: expected two renderer templates")

    linear_icons = (
        's.jsx("span",{className:"nexsale-quick-icon nexsale-quick-linear-icon",children:'
        'je===0?s.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",'
        'strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round",children:['
        's.jsx("path",{d:"M4 19V10"}),s.jsx("path",{d:"M10 19V5"}),' 
        's.jsx("path",{d:"M16 19v-7"}),s.jsx("path",{d:"M22 19V8"})]}):'
        'je===1?s.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",'
        'strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round",children:['
        's.jsx("circle",{cx:9,cy:7,r:4}),s.jsx("path",{d:"M2 21v-2a7 7 0 0 1 14 0v2"}),' 
        's.jsx("path",{d:"M16 3.2a4 4 0 0 1 0 7.6"}),s.jsx("path",{d:"M19 14.5a6 6 0 0 1 3 5.5v1"})]}):'
        's.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",'
        'strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round",children:['
        's.jsx("rect",{x:3,y:3,width:18,height:18,rx:3}),s.jsx("circle",{cx:8.5,cy:8.5,r:1.5}),' 
        's.jsx("path",{d:"m21 15-5-5L5 21"})]})})'
    )
    if 'className:"nexsale-quick-icon nexsale-quick-linear-icon"' not in source:
        if source.count(quick_icon_new) < 1:
            raise RuntimeError("linear empty chat shortcut icons: renderer token not found")
        source = source.replace(quick_icon_new, linear_icons, 1)

    source = replace_once(
        source,
        'className:"flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors",title:"切换模型",children:[f?s.jsx(Gn,{className:"w-3.5 h-3.5 text-amber-400"}):s.jsx(UC,{className:"w-3.5 h-3.5"}),s.jsx("span",{className:"max-w-[100px] truncate",children:l?l.name:"选择模型"}),s.jsx(Tr,{className:"w-3 h-3 opacity-50"})]',
        'className:"nexsale-model-trigger flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors",title:"切换模型",children:[s.jsx("span",{className:"max-w-[120px] truncate",children:l?l.name:"选择模型"}),s.jsx(Tr,{className:"w-3 h-3 opacity-50"})]',
        "simplify model trigger",
    )

    # Keep only the two daily work surfaces in the primary rail.  All product
    # and system destinations are presented on /settings instead.
    old_sidebar_groups = (
        's.jsxs("div",{className:"flex-1 overflow-y-auto py-4 px-2 scrollbar-hide",children:['
        's.jsxs(zh,{isCollapsed:f,children:['
        's.jsx(Ks,{to:"/chat",icon:Ca,label:"聊天(Chat)",isCollapsed:f}),' 
        's.jsx(Ks,{to:"/cron-tasks",icon:Ip,label:"定时任务",isCollapsed:f})]}),' 
        's.jsxs(zh,{title:"Skills",isCollapsed:f,children:['
        's.jsx(Ks,{to:"/skills/rpa",icon:Ba,label:"微信BOT",isCollapsed:f}),' 
        's.jsx(Ks,{to:"/agents",icon:Gn,label:"智能体（专家）",isCollapsed:f}),' 
        's.jsx(Ks,{to:"/skills/general",icon:$i,label:"技能商店",isCollapsed:f,badge:T})]}),' 
        's.jsxs(zh,{title:"Settings",isCollapsed:f,children:['
        's.jsx(Ks,{to:"/connect",icon:Mb,label:"对外开放",isCollapsed:f}),' 
        's.jsx(Ks,{to:"/memory",icon:tl,label:"记忆",isCollapsed:f}),' 
        's.jsx(Ks,{to:"/config",icon:Uc,label:"配置",isCollapsed:f})]})]})'
    )
    compact_sidebar_groups = (
        's.jsx("div",{className:"flex-1 overflow-y-auto py-4 px-2 scrollbar-hide",children:'
        's.jsxs(zh,{isCollapsed:f,children:['
        's.jsx(Ks,{to:"/chat",icon:Ca,label:"聊天",isCollapsed:f}),' 
        's.jsx(Ks,{to:"/cron-tasks",icon:Ip,label:"定时任务",isCollapsed:f})]})})'
    )
    source = replace_once(
        source, old_sidebar_groups, compact_sidebar_groups, "compact primary navigation"
    )

    settings_rail = (
        's.jsx("div",{className:_e("mt-auto border-t border-border px-2 py-3",f&&"px-2"),children:'
        's.jsx(Ks,{to:"/settings",icon:Uc,label:"设置",isCollapsed:f})}),' 
    )
    source = replace_range_once(
        source,
        's.jsx("div",{className:_e("pb-2 space-y-3"',
        's.jsx(k$,{isOpen:l',
        settings_rail,
        "settings rail footer",
    )

    # The hub intentionally reuses the existing pages.  Account and points
    # open the existing account dialog through its public renderer event.
    if "NexSaleSettingsHub=" not in source:
        hub_marker = "$X=()=>{"
        if source.count(hub_marker) != 1:
            raise RuntimeError("settings hub: application marker not found")
        hub = r'''NexSaleSettingsHub=()=>{const e=Nr(),t=[{path:"/settings/wechat",icon:Ba,title:"微信 BOT",desc:"微信账号、好友同步与自动化功能"},{path:"/settings/agents",icon:Gn,title:"智能体",desc:"创建和管理业务专家"},{path:"/settings/skills",icon:$i,title:"技能商店",desc:"安装与管理可用技能"},{path:"/settings/connect",icon:Mb,title:"对外开放",desc:"向外部 Agent 开放 NexSale 能力"},{path:"/settings/memory",icon:tl,title:"记忆",desc:"查看和维护长期记忆"},{path:"/settings/general",icon:Uc,title:"通用设置",desc:"权限、数据迁移与模型配置"}],n=r=>window.dispatchEvent(new CustomEvent("yoko:open-account",{detail:{tab:r}})),r=({icon:i,title:l,desc:c,onClick:d})=>s.jsxs("button",{type:"button",onClick:d,className:"group flex w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-hover",children:[s.jsx("span",{className:"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-secondary",children:s.jsx(i,{className:"h-5 w-5",strokeWidth:1.45})}),s.jsxs("span",{className:"min-w-0 flex-1",children:[s.jsx("span",{className:"block text-[15px] font-medium text-primary",children:l}),s.jsx("span",{className:"mt-1 block text-xs leading-5 text-secondary",children:c})]}),s.jsx(Xn,{className:"h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5",strokeWidth:1.45})]});return s.jsxs("div",{className:"h-full overflow-y-auto bg-background",children:[s.jsx("div",{className:"border-b border-border px-8 py-5",children:s.jsxs("div",{className:"mx-auto max-w-5xl",children:[s.jsx("h1",{className:"text-xl font-semibold tracking-tight text-primary",children:"设置"}),s.jsx("p",{className:"mt-1 text-sm font-normal text-secondary",children:"管理 NexSale 的业务能力、账户与系统选项"})]})}),s.jsxs("div",{className:"mx-auto max-w-5xl space-y-8 px-8 py-8",children:[s.jsxs("section",{children:[s.jsx("h2",{className:"mb-3 text-xs font-medium tracking-wide text-muted",children:"账户"}),s.jsxs("div",{className:"grid grid-cols-1 gap-3 md:grid-cols-2",children:[s.jsx(r,{icon:R4,title:"账户管理",desc:"查看账户资料与登录状态",onClick:()=>n("account")}),s.jsx(r,{icon:$i,title:"积分与充值",desc:"查看积分余额、记录与订单",onClick:()=>n("points")})]})]}),s.jsxs("section",{children:[s.jsx("h2",{className:"mb-3 text-xs font-medium tracking-wide text-muted",children:"功能与系统"}),s.jsx("div",{className:"grid grid-cols-1 gap-3 md:grid-cols-2",children:t.map(({path:n,icon:i,title:l,desc:c})=>s.jsx(r,{icon:i,title:l,desc:c,onClick:()=>e(n)},n))})]})]})]})},'''
        source = source.replace(hub_marker, hub + hub_marker, 1)

    route_anchor = 's.jsx(qr,{path:"/chat",element:s.jsx(YY,{})}),' 
    settings_routes = (
        's.jsx(qr,{path:"/settings",element:s.jsx(NexSaleSettingsHub,{})}),' 
        's.jsx(qr,{path:"/settings/wechat",element:s.jsx(bK,{})}),' 
        's.jsx(qr,{path:"/settings/agents",element:s.jsx(HK,{})}),' 
        's.jsx(qr,{path:"/settings/skills",element:s.jsx(XY,{})}),' 
        's.jsx(qr,{path:"/settings/connect",element:s.jsx(jX,{})}),' 
        's.jsx(qr,{path:"/settings/memory",element:s.jsx(_X,{})}),' 
        's.jsx(qr,{path:"/settings/general",element:s.jsx(lX,{})}),' 
    )
    if settings_routes not in source:
        source = replace_once(
            source,
            route_anchor,
            route_anchor + settings_routes,
            "second-level settings routes",
        )

    BUNDLE.write_text(source)
    print("Patched NexSale shell branding and navigation")


if __name__ == "__main__":
    main()
