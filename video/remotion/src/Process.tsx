// 制作過程ショート動画(テンプレート)。props を変えるだけで次の作品にも使える。
import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { FONT } from "./brand";
import { COMMON, TL, fill, type ProcessProps } from "./config";
import { Phone } from "./scenes/Phone";
import { Backdrop, Closing, Header, Hook, StepCard, UrlNotice } from "./scenes/Overlays";
import { ScenesProcess } from "./ScenesProcess";

export const Process: React.FC<ProcessProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (props.scenes) return <ScenesProcess {...props} />;
  const hook = fill(COMMON.hookTemplate, props);
  const closing = fill(COMMON.closing[props.platform], props);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <Phone slug={props.slug} />
      <Header />
      <StepCard at={TL.step1[0]} label={COMMON.steps[0].label} title={COMMON.steps[0].title} />
      <StepCard at={TL.step2[0]} label={COMMON.steps[1].label} title={COMMON.steps[1].title} />
      <StepCard at={TL.step3[0]} label={COMMON.steps[2].label} title={COMMON.steps[2].title} />
      <StepCard at={TL.complete[0]} label="COMPLETE" title="完成" />
      <Sequence name="Hook" durationInFrames={Math.round((TL.hook[1] + 0.5) * fps)} premountFor={fps}>
        <Hook text={hook} accent={`${props.minutes}分`} />
      </Sequence>
      <Sequence name="Closing" from={Math.round(TL.closing[0] * fps)} durationInFrames={durationInFrames - Math.round(TL.closing[0] * fps)} layout="none">
        <Closing text={closing} keyword={props.keyword} handle={COMMON.handle} />
      </Sequence>
      <UrlNotice />
    </AbsoluteFill>
  );
};
