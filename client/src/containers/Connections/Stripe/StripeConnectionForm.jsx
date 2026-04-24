import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Button,
  FieldError,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { useDispatch, useSelector } from "react-redux";

import Row from "../../../components/Row";
import { ButtonSpinner } from "../../../components/ButtonSpinner";
import { testRequest } from "../../../slices/connection";
import { selectTeam } from "../../../slices/team";

const STRIPE_API_HOST = "https://api.stripe.com/v1";

function StripeConnectionForm(props) {
  const { editConnection, onComplete, addError } = props;

  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [connection, setConnection] = useState({
    type: "api",
    subType: "stripe",
    host: STRIPE_API_HOST,
    name: "Stripe",
    authentication: { type: "basic_auth", user: "", pass: "" },
    optionsArray: [],
  });
  const [errors, setErrors] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [keyVisible, setKeyVisible] = useState(false);

  const dispatch = useDispatch();
  const team = useSelector(selectTeam);

  useEffect(() => {
    if (editConnection) {
      setConnection({
        ...editConnection,
        host: editConnection.host || STRIPE_API_HOST,
        subType: "stripe",
        authentication: {
          type: "basic_auth",
          user: editConnection.authentication?.user || "",
          pass: editConnection.authentication?.pass || "",
        },
      });
    }
  }, [editConnection]);

  const _validate = () => {
    const nextErrors = {};

    if (!connection.name || connection.name.length > 24) {
      nextErrors.name = "Please enter a name which is less than 24 characters";
    }

    const apiKey = connection.authentication?.user || "";
    if (!apiKey) {
      nextErrors.apiKey = "Enter your Stripe secret or restricted API key";
    } else if (apiKey.startsWith("pk_")) {
      nextErrors.apiKey = "Publishable Stripe keys cannot read your Stripe data";
    } else if (!apiKey.startsWith("sk_") && !apiKey.startsWith("rk_")) {
      nextErrors.apiKey = "Stripe keys should start with sk_ or rk_";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const _buildConnection = (test = false) => ({
    ...connection,
    type: "api",
    subType: "stripe",
    host: test ? `${STRIPE_API_HOST}/balance` : STRIPE_API_HOST,
    authentication: {
      type: "basic_auth",
      user: connection.authentication?.user || "",
      pass: connection.authentication?.pass || "",
    },
    options: [],
  });

  const _onTestRequest = () => {
    if (!_validate()) return;

    setTestLoading(true);
    setTestResult(null);
    dispatch(testRequest({ team_id: team?.id, connection: _buildConnection(true) }))
      .then(async (response) => {
        const body = await response.payload.text();
        setTestResult({
          status: response.payload.status,
          ok: response.payload.ok,
          body,
        });
      })
      .catch(() => {
        setTestResult({ ok: false, status: 400, body: "Stripe test request failed" });
      })
      .finally(() => setTestLoading(false));
  };

  const _onCreateConnection = () => {
    if (!_validate()) return;

    setLoading(true);
    onComplete(_buildConnection(false))
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  };

  const _onChangeAuthParams = (value) => {
    setConnection({
      ...connection,
      authentication: {
        type: "basic_auth",
        user: value,
        pass: "",
      },
    });
  };

  return (
    <div className="p-4 bg-surface border border-divider rounded-3xl pb-10">
      <div>
        <p className="font-semibold">
          {!editConnection && "Connect to Stripe"}
          {editConnection && `Edit ${editConnection.name}`}
        </p>
        <div className="mt-5 mb-5">
          <Row>
            <TextField fullWidth className="max-w-[500px]" name="stripe-name" isInvalid={Boolean(errors.name)}>
              <Label>Enter a name for your connection</Label>
              <Input
                placeholder="Enter a name you can recognize later"
                value={connection.name || ""}
                onChange={(e) => setConnection({ ...connection, name: e.target.value })}
                variant="secondary"
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </TextField>
          </Row>

          <div className="h-4" />
          <Row>
            <TextField fullWidth className="max-w-[500px]" name="stripe-api-key" isInvalid={Boolean(errors.apiKey)}>
              <Label>Stripe API key</Label>
              <div className="flex flex-row gap-2">
                <Input
                  placeholder="sk_live_..."
                  type={keyVisible ? "text" : "password"}
                  value={connection.authentication?.user || ""}
                  onChange={(e) => _onChangeAuthParams(e.target.value)}
                  variant="secondary"
                />
                <Button
                  isIconOnly
                  aria-label={keyVisible ? "Hide Stripe API key" : "Show Stripe API key"}
                  variant="tertiary"
                  onPress={() => setKeyVisible(!keyVisible)}
                >
                  {keyVisible ? <LuEyeOff /> : <LuEye />}
                </Button>
              </div>
              {errors.apiKey ? <FieldError>{errors.apiKey}</FieldError> : null}
            </TextField>
          </Row>

          <div className="h-4" />
          <p className="max-w-[520px] text-sm text-foreground-500">
            Use a Stripe secret key or a restricted key with read access to Balance, Payment Intents, Invoices, Subscriptions, Customers, and Balance Transactions.
          </p>

          {testResult && (
            <>
              <div className="h-4" />
              <Alert status={testResult.ok ? "success" : "danger"}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {testResult.ok ? "Stripe connection test succeeded" : `Stripe connection test failed (${testResult.status})`}
                  </Alert.Title>
                </Alert.Content>
              </Alert>
            </>
          )}

          {addError && (
            <>
              <div className="h-4" />
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Server error while trying to save your connection</Alert.Title>
                  <Alert.Description>Please try again.</Alert.Description>
                </Alert.Content>
              </Alert>
            </>
          )}

          <div className="h-4" />
          <Row align="center">
            <Button
              isPending={testLoading}
              onPress={_onTestRequest}
              variant="tertiary"
            >
              {testLoading ? <ButtonSpinner /> : null}
              Test connection
            </Button>
            <Button
              isPending={loading}
              onPress={_onCreateConnection}
              variant="primary"
            >
              {loading ? <ButtonSpinner /> : null}
              Save connection
            </Button>
          </Row>
        </div>
      </div>
    </div>
  );
}

StripeConnectionForm.defaultProps = {
  editConnection: null,
  addError: null,
};

StripeConnectionForm.propTypes = {
  onComplete: PropTypes.func.isRequired,
  editConnection: PropTypes.object,
  addError: PropTypes.bool,
};

export default StripeConnectionForm;
