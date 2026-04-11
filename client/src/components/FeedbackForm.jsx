import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button, Input, Label, TextArea,
  TextField,
} from "@heroui/react";

import { selectUser, sendFeedback } from "../slices/user";
import { ButtonSpinner } from "./ButtonSpinner";
import Row from "./Row";
import Text from "./Text";

function FeedbackForm() {
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");

  const user = useSelector(selectUser);
  const dispatch = useDispatch();

  const _onSendFeedback = () => {
    setLoading(true);
    setSuccess(false);
    setSubmitError(false);
    dispatch(sendFeedback({
      name,
      feedback,
      email: user.email,
    }))
      .then(() => {
        setLoading(false);
        setSuccess(true);
      })
      .catch(() => {
        setLoading(false);
        setSubmitError(true);
      });
  };

  return (
    <div className="flex flex-col gap-2 max-w-md">
      <Row>
        <Text size="h4">{"Feedback & Suggestions"}</Text>
      </Row>
      <div className="text-muted text-sm">
        Your feedback is valuable to us. Please share your thoughts and help us improve.
      </div>
      <div className="h-1" />
      <Row>
        <TextField name="name" fullWidth variant="secondary">
          <Label>Your name</Label>
          <Input
            onChange={(e) => setName(e.target.value)}
            name="name"
            placeholder="Can be anonymous"
            fullWidth
            variant="secondary"
          />
        </TextField>
      </Row>
      <Row>
        <TextField name="feedback" fullWidth variant="secondary">
          <Label>Your Comments</Label>
          <TextArea
            onChange={(e) => setFeedback(e.target.value)}
            name="feedback"
            placeholder="Tell us about your exprience with our product"
            fullWidth
            variant="secondary"
            rows={5}
          />
        </TextField>
      </Row>
      {(success || submitError) && <div className="h-0.5" />}
      <Row>
        {success
            && <Text color="success">{"We received your feedback and will work on it! Thank you."}</Text>}
        {submitError
            && <Text color="danger">{"Something went wront, please try again or email us directly on support@chartbrew.com"}</Text>}
      </Row>
      <Row>
        <Button
          isDisabled={!feedback}
          isPending={loading}
          onClick={() => _onSendFeedback()}
          variant="primary"
        >
          {loading ? <ButtonSpinner /> : null}
          Send feedback
        </Button>
      </Row>
    </div>
  );
}

export default FeedbackForm;
