<script>
  let stage = 0;
  let isRunning = false;
  let isPaused = false;
  let currentStageName = '';

  const stages = [
    'Repository Discovery',
    'Evidence Extraction',
    'Candidate Knowledge Base',
    'Load Three Jobs',
    'Requirement Extraction',
    'Evidence Matching',
    'Fit/Gap Analysis',
    'Application Strategy',
    'Document Generation',
    'Truth Audit',
    'Final Output'
  ];

  function runDemo() {
    if (isRunning && !isPaused) return;
    if (isPaused) {
      isPaused = false;
      processStage();
      return;
    }
    isRunning = true;
    stage = 0;
    processStage();
  }

  function pauseDemo() {
    isPaused = true;
  }

  function resetDemo() {
    isRunning = false;
    isPaused = false;
    stage = 0;
    currentStageName = '';
  }

  function processStage() {
    if (!isRunning || isPaused) return;
    if (stage >= stages.length) {
      isRunning = false;
      return;
    }
    currentStageName = stages[stage];
    stage = stage + 1;
    if (stage < stages.length) {
      setTimeout(processStage, 2000);
    } else {
      isRunning = false;
    }
  }
</script>

<div class="demo-engine">
  <div class="demo-controls">
    <button class="btn-primary" on:click={runDemo} disabled={isRunning && !isPaused}>
      {isRunning ? (isPaused ? 'Resume' : 'Running...') : 'Run Demo'}
    </button>
    <button class="btn-secondary" on:click={pauseDemo} disabled={!isRunning || isPaused}>
      Pause
    </button>
    <button class="btn-secondary" on:click={resetDemo}>
      Reset
    </button>
  </div>

  {#if isRunning || stage > 0}
    <div class="progress-indicator">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(stage / stages.length) * 100 + '%'}"></div>
      </div>
      <div class="progress-text">
        {stage + 1} / {stages.length} — {currentStageName}
      </div>
    </div>
  {/if}

  <div class="stage-content">
    <h2>Stage: {currentStageName || 'Ready'}</h2>
    <p>Current stage: {stage}</p>
  </div>
</div>

<style>
  .demo-engine {
    max-width: 1400px;
    margin: 0 auto;
  }

  .demo-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    justify-content: center;
  }

  .btn-primary, .btn-secondary {
    padding: 0.75rem 1.5rem;
    border: 1px solid #333;
    background: #111;
    color: #fff;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #22d3ee;
    color: #000;
    border-color: #22d3ee;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #333;
  }

  .btn-primary:disabled, .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .progress-indicator {
    margin-bottom: 2rem;
  }

  .progress-bar {
    height: 4px;
    background: #222;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #22d3ee, #818cf8);
    transition: width 0.5s ease;
  }

  .progress-text {
    font-size: 0.875rem;
    color: #888;
  }

  .stage-content {
    background: #111;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .stage-content h2 {
    font-size: 1.5rem;
    color: #fff;
    margin-bottom: 1.5rem;
  }

  .stage-content p {
    font-size: 0.875rem;
    color: #888;
  }
</style>
