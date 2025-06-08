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

    test('queues publish while previous is inflight', () => {
        const pub = new MqttPublisher();
        (pub as any).client = fakeClient;

        let cb: Function | undefined;
        publishMock.mockImplementationOnce((t: string, m: string, o: any, c: Function) => { cb = c; })
                   .mockImplementation((t: string, m: string, o: any, c: Function) => c());

        pub.publish('topic/1', 'on');
        pub.publish('topic/1', 'off');

        expect(publishMock).toHaveBeenCalledTimes(1);
        expect((pub as any).queued['topic/1']).toBe('off');

        cb && cb();

        expect(publishMock).toHaveBeenCalledTimes(2);
        expect(publishMock.mock.calls[1][1]).toBe('off');
        expect((pub as any).queued['topic/1']).toBeUndefined();
        expect((pub as any).lastPayload['topic/1']).toBe('off');
    });

    test('keeps only latest queued message', () => {
        const pub = new MqttPublisher();
        (pub as any).client = fakeClient;

        let cb: Function | undefined;
        publishMock.mockImplementationOnce((t: string, m: string, o: any, c: Function) => { cb = c; })
                   .mockImplementation((t: string, m: string, o: any, c: Function) => c());

        pub.publish('topic/1', 'A');
        pub.publish('topic/1', 'B');
        pub.publish('topic/1', 'C');

        expect(publishMock).toHaveBeenCalledTimes(1);
        expect((pub as any).queued['topic/1']).toBe('C');

        cb && cb();

        expect(publishMock).toHaveBeenCalledTimes(2);
        expect(publishMock.mock.calls[1][1]).toBe('C');
    });
});