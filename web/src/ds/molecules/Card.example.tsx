import { Card, CardActions, CardBody, CardData, CardLabel, CardTitle } from "./Card";

const link = "inline-flex min-h-11 items-center rounded-control bg-indigo px-4 font-sans text-button font-medium text-on-indigo";
const share = "inline-flex min-h-11 items-center px-2 font-sans text-button-compact font-medium text-indigo-lt";

export default function CardExample() {
  return (
    <div className="grid max-w-3xl gap-4">
      <Card className="max-w-sm">
        <CardLabel>Your week</CardLabel>
        <CardTitle>Jupiter squares your Jupiter</CardTitle>
        <CardBody>You may want more room to grow than your routine allows. Pick one thing to stretch.</CardBody>
        <CardData>Jupiter 21°04′ Leo · orb 0°19′</CardData>
        <CardActions share={<button type="button" className={share}>Share</button>}>
          <a href="#card" className={link}>Open the reading</a>
        </CardActions>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardLabel className="text-brass">Did you know</CardLabel>
          <CardTitle size="sm">Your Venus was going backwards</CardTitle>
          <CardBody>Seen from Earth, it seemed to move back through Aries the day you were born.</CardBody>
        </Card>
        <Card variant="glass">
          <CardLabel className="text-indigo-lt">Learn</CardLabel>
          <CardTitle size="sm">Whole-sign houses</CardTitle>
          <CardBody>Why your houses can differ from other sites.</CardBody>
        </Card>
        <Card variant="tint">
          <CardLabel className="text-indigo-lt">Recommended</CardLabel>
          <CardTitle size="sm">Couple</CardTitle>
          <CardBody>3 credits · a report each and one together.</CardBody>
        </Card>
        <Card variant="tone" tone="rose">
          <CardLabel className="text-rose">Heavy</CardLabel>
          <CardTitle size="sm">Work feels heavier</CardTitle>
          <CardBody>For a few months you may take more on.</CardBody>
        </Card>
        <Card variant="tone" tone="brass">
          <CardLabel className="text-brass">No birth time</CardLabel>
          <CardTitle size="sm">Houses need a birth time</CardTitle>
          <CardBody>Add it and the houses appear.</CardBody>
        </Card>
        <Card variant="glass" large>
          <CardTitle>The hero panel keeps the 20 px corner</CardTitle>
        </Card>
      </div>
    </div>
  );
}
