import MqttPublisher from '../../src/utils/mqttPublisher';
import { MqttClient } from 'mqtt';
import mqtt from 'mqtt';

jest.mock('mqtt', () => ({ connect: jest.fn() }));

jest.mock('../../src/envSwitcher', () => ({ mosquittoUrl: 'mqtt://test' }));

jest.mock('../../src/clients/vaultClient', () => ({
    login: jest.fn(),
    getSecret: jest.fn(async () => ({
        data: { MOSQUITTO_USERNAME: 'user', MOSQUITTO_PASSWORD: 'pass' }
    }))
}));

describe('MqttPublisher', () => {
    const publishMock = jest.fn((topic: string, msg: string, options: any, cb: Function) => cb());
    const fakeClient = { publish: publishMock, on: jest.fn(), end: jest.fn() } as unknown as MqttClient;

    beforeEach(() => {
        (mqtt.connect as jest.Mock).mockReturnValue(fakeClient);
        publishMock.mockClear();
    });

    test('publishes when message changes', () => {
        const pub = new MqttPublisher();
        (pub as any).client = fakeClient;

        pub.publish('topic/1', 'on');

        expect(publishMock).toHaveBeenCalledTimes(1);
        expect(publishMock).toHaveBeenCalledWith('topic/1', 'on', {}, expect.any(Function));
        expect((pub as any).lastPayload['topic/1']).toBe('on');
    });

    test('skips publish when message unchanged', () => {
        const pub = new MqttPublisher();
        (pub as any).client = fakeClient;

        pub.publish('topic/1', 'on');
        publishMock.mockClear();
        pub.publish('topic/1', 'on');

        expect(publishMock).not.toHaveBeenCalled();
    });
});