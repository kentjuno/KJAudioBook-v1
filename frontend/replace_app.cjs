const fs = require('fs');
const file = 'f:/AntiGravity/AudioBook-KJ/frontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Header block
const headerStart = content.indexOf('<header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">');
const headerEnd = content.indexOf('</header>', headerStart) + '</header>'.length;

const headerReplacement = `      <Header 
        handleImportProject={handleImportProject}
        exportProject={exportProject}
        handleFileUpload={handleFileUpload}
        handleRenderAll={handleRenderAll}
        handleMixAndExport={handleMixAndExport}
        handleSyncToTimeline={handleSyncToTimeline}
        isGenerating={isGenerating}
      />`;

content = content.slice(0, headerStart) + headerReplacement + content.slice(headerEnd);

// Replace ScriptSidebar block
const mainStart = content.indexOf("{activeTab === 'audio' && (");
// find the <main ...> start index after mainStart
const mainTagStart = content.indexOf('<main ', mainStart);
const mainEnd = content.indexOf('</main>', mainTagStart) + '</main>'.length;
// it ends with )} 
const endOfMainBlock = content.indexOf(')}', mainEnd) + ')}'.length;

const mainReplacement = `{activeTab === 'audio' && (
      <ScriptSidebar
        addLine={addLine}
        deleteLine={deleteLine}
        playSample={playSample}
        handleDragOverContainer={handleDragOverContainer}
        handleSort={handleSort}
        createSyntheticVoice={createSyntheticVoice}
        togglePlayVoiceRef={togglePlayVoiceRef}
        handleSaveProfile={handleSaveProfile}
        isSortingMode={isSortingMode}
        setIsSortingMode={setIsSortingMode}
        playingId={playingId}
        isCreatingSynthetic={isCreatingSynthetic}
        playingVoiceRef={playingVoiceRef}
        expandedScriptLines={expandedScriptLines}
        toggleScriptLine={toggleScriptLine}
        expandedVoices={expandedVoices}
        toggleVoice={toggleVoice}
        timelineScrollRef={timelineScrollRef}
        dragItem={dragItem}
        dragOverItem={dragOverItem}
      />
      )}`;

content = content.slice(0, mainStart) + mainReplacement + content.slice(endOfMainBlock);

// Replace Timeline block
const timelineStart = content.indexOf("{(activeTab === 'audio' || activeTab === 'post-production') && (");
const videoTabStart = content.indexOf("{activeTab === 'video' && (", timelineStart);

const timelineReplacement = `{(activeTab === 'audio' || activeTab === 'post-production') && (
        <Timeline
          toggleTimelinePlay={toggleTimelinePlay}
          handleTimelineSeek={handleTimelineSeek}
          handleClearTimeline={handleClearTimeline}
          handleTimelineClipMouseDown={handleTimelineClipMouseDown}
          handleVideoClipMouseDown={handleVideoClipMouseDown}
          handleVideoResizeMouseDown={handleVideoResizeMouseDown}
          handleDeleteTimelineClip={handleDeleteTimelineClip}
          handleTimelineResizeStart={handleTimelineResizeStart}
          timelineScrollRef={timelineScrollRef}
          timelineAudioRefs={timelineAudioRefs}
          timelineVideoRefs={timelineVideoRefs}
        >
          {activeTab === 'post-production' && (
            <div className="flex-[1.5] flex min-h-[300px] border-b border-slate-800 bg-slate-950">
              <div className="flex-1 flex flex-col items-center justify-center relative bg-black/80 p-6">
                <div className="w-full max-w-4xl aspect-video bg-black rounded-xl border border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-white/5">
                  {timelineVideoClips.length === 0 ? (
                    <>
                      <Video className="w-12 h-12 text-slate-700 mb-3 opacity-50" />
                      <span className="text-slate-500 font-medium tracking-widest text-sm uppercase">Video Preview</span>
                      <span className="text-slate-600 text-xs mt-1">Sync video from Video Studio</span>
                    </>
                  ) : (
                    <>
                      {timelineVideoClips.map(clip => (
                        <video
                          key={clip.id}
                          ref={el => { if (el) timelineVideoRefs.current[clip.id] = el; }}
                          src={clip.videoUrl}
                          className={\`absolute inset-0 w-full h-full object-contain transition-opacity duration-100 \${
                            timelineTime >= clip.startTime && timelineTime < clip.startTime + clip.duration 
                              ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                          }\`}
                          muted={!clip.keepSound}
                          loop={false}
                          playsInline
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
              <PropertiesInspector />
            </div>
          )}
        </Timeline>
      )}

      `;

content = content.slice(0, timelineStart) + timelineReplacement + content.slice(videoTabStart);

fs.writeFileSync(file, content);
console.log('App.tsx refactored successfully.');
