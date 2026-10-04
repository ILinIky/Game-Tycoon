import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Music2,
  Volume2,
  VolumeX,
  Waves,
  MousePointer2,
  Play,
} from "lucide-react";
import { studioAudio, type AudioChannel } from "../../audio/StudioAudio";
import { useAudioState } from "../../hooks/useStudioAudio";
import { useStudioMotion } from "./GameMotion";
import { Modal } from "../ui";

export default function StudioRadio({
  open,
  hidden,
  onOpen,
  onClose,
}: {
  open: boolean;
  hidden: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const audio = useAudioState(),
    animated = useStudioMotion();
  const playing = audio.status === "running" && !audio.muted && audio.music > 0;
  const status =
    audio.status === "unavailable"
      ? "Audio hier nicht verfügbar"
      : audio.muted
        ? "Stummgeschaltet"
        : audio.status === "locked"
          ? "Klick zum Einschalten"
          : audio.status === "suspended"
            ? "Wartet auf dich"
            : audio.music === 0
              ? "Musik aus"
              : "Jetzt läuft";
  return (
    <>
      <button
        hidden={hidden}
        className={`radio-launch ${playing ? "playing" : ""}`}
        aria-label="Studio-Radio öffnen"
        aria-expanded={open}
        onClick={onOpen}
        data-audio-state={audio.status}
        data-muted={audio.muted}
      >
        <span className="radio-symbol">
          {audio.muted ? <VolumeX size={17} /> : <AudioLines size={17} />}
        </span>
        <span>
          <small>STUDIO RADIO</small>
          <strong>{playing ? "Golden Hour" : status}</strong>
        </span>
        <span className="radio-meter" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="game-overlay radio-overlay"
            key="radio"
            initial={animated ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animated ? 0.22 : 0 }}
          >
            <Modal
              title="Studio-Radio"
              className="radio-modal"
              onClose={onClose}
            >
              <div className={`radio-art ${playing ? "playing" : ""}`}>
                <div className="radio-art-horizon" />
                <span className="radio-onair">
                  <i /> {playing ? "ON AIR" : "STUDIO ZERO ORIGINALS"}
                </span>
                <div className="cassette">
                  <div className="cassette-label">
                    <span>SIDE A · 78 BPM</span>
                    <strong>Golden Hour</strong>
                    <small>IDEAS SOUND BETTER HERE.</small>
                  </div>
                  <div className="cassette-tape">
                    <i />
                    <b />
                    <i />
                  </div>
                  <div className="cassette-base" />
                </div>
                <span className="radio-art-caption">
                  COZY BEATS FOR BIG IDEAS
                </span>
              </div>
              <div className="radio-now">
                <div>
                  <span className="eyebrow">{status}</span>
                  <h3>Golden Hour</h3>
                  <p>Warme Keys · sanfter Beat · ein neuer Anfang</p>
                </div>
                <button
                  className={`radio-mute ${audio.muted ? "muted" : ""}`}
                  aria-label={
                    audio.muted ? "Ton einschalten" : "Alles stummschalten"
                  }
                  aria-pressed={audio.muted}
                  onClick={() => studioAudio.toggleMute()}
                >
                  {audio.muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
                </button>
              </div>
              <div className="radio-mixer">
                {(
                  [
                    { channel: "music", label: "Musik", icon: Music2 },
                    {
                      channel: "effects",
                      label: "Spielsounds",
                      icon: MousePointer2,
                    },
                    { channel: "ambience", label: "Raumklang", icon: Waves },
                  ] as const
                ).map(({ channel, label, icon: Icon }) => (
                  <label className="mixer-channel" key={channel}>
                    <span>
                      <Icon size={16} />
                      {label}
                      <output>{Math.round(audio[channel] * 100)}%</output>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(audio[channel] * 100)}
                      aria-label={`${label} Lautstärke`}
                      onChange={(e) =>
                        studioAudio.set(
                          channel as AudioChannel,
                          Number(e.target.value) / 100,
                        )
                      }
                      style={
                        {
                          "--level": `${audio[channel] * 100}%`,
                        } as React.CSSProperties
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="radio-bottom">
                <button
                  className="game-action secondary"
                  disabled={audio.muted || audio.status === "unavailable"}
                  onClick={() => {
                    void studioAudio
                      .activate()
                      .then(() => studioAudio.play("confirm"));
                  }}
                >
                  <Play size={14} /> Sound testen
                </button>
                <span>
                  <kbd>M</kbd> Ton an / aus
                </span>
              </div>
              <p className="radio-note">
                Deine Lautstärke bleibt gespeichert. Beim Wechsel in einen
                anderen Tab pausiert der Ton.
              </p>
            </Modal>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
