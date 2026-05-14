import os

file_path = r'f:\AntiGravity\AudioBook-KJ\frontend\src\App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

broken_part = """                  key={clip.id}
                  onMouseDown={(e) => handleTimelineClipMouseDown(e, clip)}
                  className={`absolute h-14 rounded-md overflow-hidden cursor-move transition-all duration-200 shadow-md ${
                    isDragging 
                      ? 'opacity-70 z-40 ring-2 ring-white scale-[1.02] bg-amber-500/80 border-amber-400' 
                      : isSelected 
                  {/* Audio Element Hidden */}
                  <audio 
                    src={clip.audioUrl} 
            setCharactersMetadata={setCharactersMetadata}
            flowkitProjectId={flowkitProjectId}
            setFlowkitProjectId={setFlowkitProjectId}
            handleUploadCharacterImage={handleUploadCharacterImage}
            handleGenerateAssetImage={handleGenerateAssetImage}
            handleDeleteEntity={handleDeleteEntity}
            isGeneratingAsset={isGeneratingAsset}
          />
        </div>
      )}
    </div>
  );
}

export default App;"""

fixed_part = """                  key={clip.id}
                  onMouseDown={(e) => handleTimelineClipMouseDown(e, clip)}
                  className={`absolute h-14 rounded-md overflow-hidden cursor-move transition-all duration-200 shadow-md ${
                    isDragging 
                      ? 'opacity-70 z-40 ring-2 ring-white scale-[1.02] bg-amber-500/80 border-amber-400' 
                      : isSelected 
                        ? 'z-30 bg-indigo-500/90 border-2 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.6)]' 
                        : 'z-10 bg-amber-500/80 border border-amber-400 hover:bg-amber-400'
                  }`}
                  style={{ top: `${top + 4}px`, left: `${left}px`, width: `${width}px` }}
                >
                  <div className={`px-1 py-0.5 text-[9px] font-bold truncate flex justify-between items-center ${isSelected ? 'text-indigo-50 bg-indigo-400/50' : 'text-slate-900 bg-amber-400/50'}`}>
                    <span>{clip.speaker}</span>
                    <button 
                      onClick={(e) => handleDeleteTimelineClip(e, clip.id)}
                      className={`${isSelected ? 'text-indigo-100 hover:text-red-300 hover:bg-indigo-500' : 'text-slate-900 hover:text-red-700 hover:bg-amber-400'} bg-transparent p-0.5 rounded transition-colors`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Waveform Real */}
                  <div className="w-full mt-1 opacity-70 flex items-center px-1">
                    <Waveform audioUrl={clip.audioUrl} width={width} />
                  </div>
                  {/* Audio Element Hidden */}
                  <audio 
                    src={clip.audioUrl} 
                    ref={el => {
                      if (el) timelineAudioRefs.current[clip.id] = el;
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="mt-4 mx-auto px-4 w-full max-w-[1600px] flex-1">
          <VideoStudio 
            script={script} 
            setScript={setScript} 
            charactersMetadata={charactersMetadata}
            setCharactersMetadata={setCharactersMetadata}
            flowkitProjectId={flowkitProjectId}
            setFlowkitProjectId={setFlowkitProjectId}
            handleUploadCharacterImage={handleUploadCharacterImage}
            handleGenerateAssetImage={handleGenerateAssetImage}
            handleDeleteEntity={handleDeleteEntity}
            isGeneratingAsset={isGeneratingAsset}
          />
        </div>
      )}
    </div>
  );
}

export default App;"""

if broken_part in content:
    content = content.replace(broken_part, fixed_part)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed App.tsx successfully.")
else:
    print("Could not find the broken part in App.tsx.")
